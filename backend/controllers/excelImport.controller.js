import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { client } from '../models/client.model.js'
import { gasSilinder } from '../models/gasSilinder.model.js'
import { Category } from '../models/Category.model.js'
import { gasSubCategory } from '../models/gasSubCategory.model.js'
import ExcelJS from 'exceljs'
import fs from 'fs'

/**
 * Import fire extinguisher data from Excel.
 * 
 * Expected format:
 *   DATE | NAME | ABC-4 | ABC-6 | ABC-9 | CO2 | ... | DUE DATE
 *   (date) (str)  (qty)   (qty)   (qty)  (qty)       (date)
 * 
 * Each gas-type column header becomes the category/subcategory name.
 * Quantity in that column = number of cylinders to create.
 * If qty is 0 or empty, that gas type is skipped for that row.
 * One client + multiple cylinder records per row.
 */
const importExcelData = asyncHandler(async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            throw new ApiError(401, "Unauthorized")
        }
        if (!req.file) {
            throw new ApiError(400, "No file uploaded")
        }

        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.readFile(req.file.path)
        fs.unlink(req.file.path, () => { }) // clean up temp file

        const worksheet = workbook.worksheets[0]
        if (!worksheet || worksheet.rowCount < 2) {
            throw new ApiError(400, "Excel file is empty or has no data rows")
        }

        // ── Step 1: Parse header row to detect columns ──
        const headerRow = worksheet.getRow(1)
        let dateCol = null, nameCol = null, dueDateCol = null, cityCol = null
        const gasTypeCols = [] // { colNumber, typeName }

        headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            const val = String(cell.value || '').trim().toUpperCase()

            if (val === 'DATE' || val === 'START DATE') {
                if (!dateCol) dateCol = colNumber
            } else if (val === 'DUE DATE' || val === 'EXPIRY DATE' || val === 'END DATE' || val === 'EXPIRY') {
                if (!dueDateCol) dueDateCol = colNumber
            } else if (val === 'NAME' || val === 'FIRM NAME' || val === 'COMPANY') {
                if (!nameCol) nameCol = colNumber
            } else if (val === 'CITY' || val === 'LOCATION') {
                if (!cityCol) cityCol = colNumber
            } else {
                // Any other column is treated as a gas type (e.g. ABC-4, ABC-6, CO2)
                // Skip columns with generic headers
                const skip = ['SR', 'SR.NO', 'SL', 'NO', 'S.NO', 'EMAIL', 'PHONE', 'MOBILE', 'ADDRESS', 'STATUS']
                if (!skip.includes(val) && val.length > 0) {
                    gasTypeCols.push({ colNumber, typeName: String(cell.value || '').trim() })
                }
            }
        })

        if (!nameCol) {
            throw new ApiError(400, "Could not find 'NAME' column in the header row")
        }
        if (gasTypeCols.length === 0) {
            throw new ApiError(400, "Could not find any gas type columns (e.g. ABC-4, CO2) in the header row")
        }

        // ── Step 2: Build caches ──
        const categoryCache = {}
        const clientCache = {}

        const findOrCreateCategory = async (typeName) => {
            const key = typeName.toLowerCase().trim()
            if (categoryCache[key]) return categoryCache[key]

            // Extract base category name: "ABC-4" → "ABC", "CO2" → "CO2"
            const baseName = typeName.replace(/[\s\-]+\d+.*$/, '').trim().toUpperCase() || typeName.toUpperCase()

            let cat = await Category.findOne({ name: { $regex: new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } })
            if (!cat) {
                cat = await Category.create({ name: baseName })
            }

            let subCat = await gasSubCategory.findOne({
                name: { $regex: new RegExp(`^${typeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
                category: cat._id
            })
            if (!subCat) {
                subCat = await gasSubCategory.create({
                    name: typeName,
                    originalName: typeName,
                    category: cat._id,
                    weight: 0
                })
            }

            const result = { categoryId: cat._id, subCategoryId: subCat._id }
            categoryCache[key] = result
            return result
        }

        const findOrCreateClient = async (name, city) => {
            const firmName = name.trim()
            if (!firmName) throw new Error("Name is empty")
            const cacheKey = firmName.toLowerCase()
            if (clientCache[cacheKey]) return clientCache[cacheKey]

            let existing = await client.findOne({ firmName: { $regex: new RegExp(`^${firmName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } })
            if (existing) {
                clientCache[cacheKey] = existing
                return existing
            }

            existing = await client.create({
                firmName,
                contactPerson: firmName,
                address: city || 'Imported',
                city: city || '',
                createdBy: undefined
            })
            clientCache[cacheKey] = existing
            return existing
        }

        const parseDate = (val) => {
            if (!val) return null
            if (val instanceof Date) return val
            const str = String(val).trim()
            const parts = str.split(/[-\/.]/)
            if (parts.length === 3) {
                const [a, b, c] = parts.map(Number)
                if (c > 100) return new Date(c, b - 1, a)
                if (a > 100) return new Date(a, b - 1, c)
            }
            const d = new Date(str)
            return isNaN(d.getTime()) ? null : d
        }

        const parseQty = (val) => {
            if (val === null || val === undefined || val === '') return 0
            const num = Number(val)
            return isNaN(num) ? 0 : Math.max(0, Math.floor(num))
        }

        // ── Step 3: Process rows ──
        const results = { success: 0, failed: 0, errors: [] }
        const failedRows = []

        const processRow = async (rowNumber, row) => {
            const nameVal = row.getCell(nameCol).value
            if (!nameVal || String(nameVal).trim() === '') return // skip empty rows

            const name = String(nameVal).trim()
            const city = cityCol ? String(row.getCell(cityCol).value || '').trim() : ''
            const startDate = parseDate(dateCol ? row.getCell(dateCol).value : null) || new Date()
            let endDate = parseDate(dueDateCol ? row.getCell(dueDateCol).value : null)
            if (!endDate) {
                endDate = new Date(startDate)
                endDate.setFullYear(endDate.getFullYear() + 1)
            }

            const clientDoc = await findOrCreateClient(name, city)
            let createdAny = false

            for (const { colNumber, typeName } of gasTypeCols) {
                const qty = parseQty(row.getCell(colNumber).value)
                if (qty <= 0) continue

                const { categoryId, subCategoryId } = await findOrCreateCategory(typeName)

                await gasSilinder.create({
                    clientId: clientDoc._id,
                    serviceType: 'new',
                    refillingType: 'new',
                    category: categoryId,
                    kgLtr: subCategoryId,
                    quantity: qty,
                    startDate,
                    endDate,
                    status: endDate < new Date() ? 'expired' : 'ongoing'
                })
                createdAny = true
            }

            if (!createdAny) {
                throw new Error("All gas type quantities are 0 for this row")
            }
        }

        // First pass
        for (let r = 2; r <= worksheet.rowCount; r++) {
            const row = worksheet.getRow(r)
            // Skip completely empty rows
            const nameVal = row.getCell(nameCol).value
            if (!nameVal || String(nameVal).trim() === '') continue

            try {
                await processRow(r, row)
                results.success++
            } catch (err) {
                failedRows.push({ rowNumber: r, row, reason: err.message })
            }
        }

        // Retry pass
        const stillFailed = []
        for (const { rowNumber, row, reason } of failedRows) {
            try {
                await processRow(rowNumber, row)
                results.success++
            } catch (err) {
                const nameVal = row.getCell(nameCol).value
                stillFailed.push({
                    row: rowNumber,
                    name: String(nameVal || '').trim(),
                    reason: err.message
                })
                results.failed++
            }
        }
        results.errors = stillFailed

        return res.status(200).json({
            success: true,
            message: `Import complete: ${results.success} rows succeeded, ${results.failed} failed`,
            data: results
        })
    } catch (error) {
        console.error("Excel Import Error:", error)
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        })
    }
})

export { importExcelData }
