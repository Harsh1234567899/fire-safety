import { asyncHandler } from "../utils/asyncHandler.js";
import { AMC } from '../models/AMC.model.js'
import { gasSilinder } from '../models/gasSilinder.model.js'
import { fireNOC } from '../models/fireNOC.model.js'
import { amcVisit } from '../models/AMCvisit.model.js'
import { ApiResponse } from "../utils/ApiResponse.js";
import { monoIdIsValid } from "../utils/mongoDBid.js";
import mongoose from "mongoose";

const db = mongoose.connection;

const getAllServices = asyncHandler(async (req, res) => {
  const [
    amcs,
    amcVisits,
    extinguishers,
    nocRecords
  ] = await Promise.all([
    AMC.find().populate('clientId', 'firmName').lean(),
    amcVisit.find().populate('clientId', 'firmName').lean(),
    gasSilinder.find().populate('clientId', 'firmName').lean(),
    fireNOC.find().populate('clientId', 'firmName').lean(),
  ]);

  const normalizeDate = (d) => {
    if (!d) return null;
    const date = new Date(d);
    return isNaN(date.getTime()) ? null : date.toISOString();
  };


  const mappedAmcs = amcs.map(item => ({
    _id: item._id,
    model: 'amc',
    clientId: item.clientId?._id ?? item.clientId,
    firmName: item.clientId?.firmName ?? null,
    service: 'amc',
    serviceType: item.type ?? null,
    startDate: normalizeDate(item.startDate),
    endDate: normalizeDate(item.endDate),
    raw: item,
  }));

  const mappedAmcVisits = amcVisits.map(item => ({
    _id: item._id,
    model: 'AMC_VISIT',
    clientId: item.clientId?._id ?? item.clientId,
    firmName: item.clientId?.firmName ?? null,
    service: 'AMC Visit',
    serviceType: "amc-visit",
    startDate: normalizeDate(item.startDate),
    endDate: normalizeDate(item.endDate),
    raw: item,
  }));

  const mappedExtinguishers = extinguishers.map(item => ({
    _id: item._id,
    model: 'FIRE_EXTINGUISHER',
    clientId: item.clientId?._id ?? item.clientId,
    firmName: item.clientId?.firmName ?? null,
    service: 'Fire Extinguisher',
    serviceType: item.serviceType ?? null, // 'New' | 'Refilling'
    startDate: normalizeDate(item.startDate),
    endDate: normalizeDate(item.endDate),
    raw: item,
  }));

  const mappedNOCs = nocRecords.map(item => ({
    _id: item._id,
    model: 'FIRE_NOC',
    clientId: item.clientId?._id ?? item.clientId,
    firmName: item.clientId?.firmName ?? null,
    service: 'Fire NOC',
    serviceType: item.serviceType ?? null, // 'New' | 'Renewal'
    startDate: normalizeDate(item.startDate),
    endDate: normalizeDate(item.endDate),
    raw: item,
  }));

  // combine arrays
  const combined = [
    ...mappedAmcs,
    ...mappedAmcVisits,
    ...mappedExtinguishers,
    ...mappedNOCs
  ];

  // Optional: sort by startDate descending (most recent first). Adjust as needed.
  combined.sort((a, b) => {
    const da = a.startDate ? new Date(a.startDate).getTime() : 0;
    const db = b.startDate ? new Date(b.startDate).getTime() : 0;
    return db - da;
  });

  // If you don't want to include full raw docs, remove `raw` before sending
  const response = combined.map(({ raw, ...keep }) => keep);

  return res.json(new ApiResponse(200, { count: response.length, data: response }, "all data"));

});


const getClientServicesWithDetails = asyncHandler(async (req, res) => {
  try {
    const { clientId } = req.params;
    if (!clientId) {
      return res.status(400).json({ success: false, message: "Invalid clientId" });
    }

    const clientObjectId = new mongoose.Types.ObjectId(clientId);

    // Fetch client (keep minimal projection as you had)
    const clientAgg = await db.collection("clients").aggregate([
      { $match: { _id: clientObjectId } },
      { $project: { __v: 0 } }
    ]).toArray();

    const client = clientAgg[0] || null;
    if (!client) return res.status(404).json({ success: false, message: "Client not found" });

    // Common match stage
    const matchStage = { $match: { clientId: clientObjectId } };

    // Fire extinguishers pipeline
    const fePipeline = [
      matchStage,
      {
        $addFields: {
          model: "FIRE_EXTINGUISHER",
          service: "Fire Extinguisher",
          endDate: "$endDate"
        }
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryObj"
        }
      },
      { $unwind: { path: "$categoryObj", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "subcategories",
          localField: "kgLtr",
          foreignField: "_id",
          as: "kgLtrObj"
        }
      },
      { $unwind: { path: "$kgLtrObj", preserveNullAndEmptyArrays: true } }
    ];

    // AMC pipeline
    const amcPipeline = [
      matchStage,
      {
        $addFields: {
          model: "AMC",
          service: "AMC",
          serviceType: "$type",
          endDate: "$endDate"
        }
      },
      {
        $lookup: {
          from: "documents",
          localField: "_id",
          foreignField: "referenceId",
          as: "documents"
        }
      }
    ];

    // AMC Visit pipeline
    const amcVisitPipeline = [
      matchStage,
      {
        $addFields: {
          model: "AMC_VISIT",
          service: "AMC Visit",
          serviceType: null,
          endDate: "$endDate"
        }
      }
    ];

    // Fire NOC pipeline
    const nocPipeline = [
      matchStage,
      {
        $addFields: {
          model: "FIRE_NOC",
          service: "Fire NOC",
          endDate: "$endDate"
        }
      },
      {
        $lookup: {
          from: "noctypes",
          localField: "nocType",
          foreignField: "_id",
          as: "nocTypeObj"
        }
      },
      { $unwind: { path: "$nocTypeObj", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "documents",
          localField: "_id",
          foreignField: "referenceId",
          as: "documents"
        }
      }
    ];

    // Combined pipeline starting from fireextinguishers collection
    const pipeline = [
      ...fePipeline,
      { $unionWith: { coll: "amcs", pipeline: amcPipeline } },
      { $unionWith: { coll: "amcvisits", pipeline: amcVisitPipeline } },
      { $unionWith: { coll: "firenocs", pipeline: nocPipeline } },
      { $sort: { createdAt: -1 } } // sort newest first overall
    ];

    const services = await db.collection("gassilinders").aggregate(pipeline).toArray();

    // Grouping helper
    function groupServices(servicesArray) {
      const groups = {
        fireExtinguishers: [],
        amcs: [],
        amcVisits: [],
        fireNocs: [],
        unknown: []
      };

      for (const s of servicesArray) {
        const model = (s.model || "").toString().toUpperCase();
        const serviceName = (s.service || "").toString().toUpperCase();

        // Primary classification by explicit model
        if (model === "FIRE_EXTINGUISHER" || serviceName.includes("FIRE EXTINGUISHER")) {
          groups.fireExtinguishers.push(s);
          continue;
        }
        if (model === "AMC") {
          groups.amcs.push(s);
          continue;
        }
        if (model === "AMC_VISIT" || serviceName.includes("AMC VISIT")) {
          groups.amcVisits.push(s);
          continue;
        }
        if (model === "FIRE_NOC" || serviceName.includes("FIRE NOC") || s.nocType) {
          groups.fireNocs.push(s);
          continue;
        }

        // Heuristics/fallbacks
        if (s.category || s.kgLtr || s.service === "Fire Extinguisher") {
          groups.fireExtinguishers.push(s);
          continue;
        }
        if (s.type || s.service === "AMC") {
          groups.amcs.push(s);
          continue;
        }

        // If still unknown, push to unknown bucket
        groups.unknown.push(s);
      }

      // Sort each group newest-first by createdAt if present (fallback to updatedAt)
      const sortByNewest = arr => arr.sort((a, b) => {
        const ta = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const tb = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return tb - ta;
      });

      sortByNewest(groups.fireExtinguishers);
      sortByNewest(groups.amcs);
      sortByNewest(groups.amcVisits);
      sortByNewest(groups.fireNocs);
      sortByNewest(groups.unknown);

      return groups;
    }

    const grouped = groupServices(services);

    // counts
    const counts = {
      total: services.length,
      fireExtinguishers: grouped.fireExtinguishers.length,
      amcs: grouped.amcs.length,
      amcVisits: grouped.amcVisits.length,
      fireNocs: grouped.fireNocs.length,
      unknown: grouped.unknown.length
    };

    return res.json({
      success: true,
      client,
      counts,
      groupedServices: grouped
    });
  } catch (err) {
    console.error("getClientServicesWithDetails error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});



const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    monoIdIsValid(id)

    const objectId = new mongoose.Types.ObjectId(id);

    // ---------- 1. FIRE EXTINGUISHER ----------
    let fe = await db.collection("gassilinders").aggregate([
      { $match: { _id: objectId } },
      {
        $addFields: {
          model: "FIRE_EXTINGUISHER",
          service: "Fire Extinguisher",
          endDate: "$endDate"
        }
      },
      {
        $lookup: {
          from: "clients",
          localField: "clientId",
          foreignField: "_id",
          as: "clientData"
        }
      },
      { $unwind: { path: "$clientData", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryObj"
        }
      },
      { $unwind: { path: "$categoryObj", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "subcategories",
          localField: "kgLtr",
          foreignField: "_id",
          as: "kgLtrObj"
        }
      },
      { $unwind: { path: "$kgLtrObj", preserveNullAndEmptyArrays: true } }
    ]).toArray();

    if (fe[0]) return res.json({ success: true, record: fe[0] });

    // ---------- 2. AMC ----------
    let amc = await db.collection("amcs").aggregate([
      { $match: { _id: objectId } },
      {
        $addFields: {
          model: "AMC",
          service: "AMC",
          serviceType: "$type",
          endDate: "$endDate"
        }
      },
      {
        $lookup: {
          from: "clients",
          localField: "clientId",
          foreignField: "_id",
          as: "clientData"
        }
      },
      { $unwind: { path: "$clientData", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "documents",
          localField: "_id",
          foreignField: "referenceId",
          as: "documents"
        }
      },
    ]).toArray();

    if (amc[0]) return res.json({ success: true, record: amc[0] });

    // ---------- 3. AMC VISIT ----------
    let amcVisit = await db.collection("amcvisits").aggregate([
      { $match: { _id: objectId } },
      {
        $addFields: {
          model: "AMC_VISIT",
          service: "AMC Visit",
          serviceType: null,
          endDate: "$endDate"
        }
      },
      {
        $lookup: {
          from: "clients",
          localField: "clientId",
          foreignField: "_id",
          as: "clientData"
        }
      },
      { $unwind: { path: "$clientData", preserveNullAndEmptyArrays: true } },
    ]).toArray();

    if (amcVisit[0]) return res.json({ success: true, record: amcVisit[0] });

    // ---------- 4. FIRE NOC ----------
    let noc = await db.collection("firenocs").aggregate([
      { $match: { _id: objectId } },
      {
        $addFields: {
          model: "FIRE_NOC",
          service: "Fire NOC",
          endDate: "$endDate"
        }
      },
      {
        $lookup: {
          from: "clients",
          localField: "clientId",
          foreignField: "_id",
          as: "clientData"
        }
      },
      { $unwind: { path: "$clientData", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "noctypes",
          localField: "nocType",
          foreignField: "_id",
          as: "nocTypeObj"
        }
      },
      { $unwind: { path: "$nocTypeObj", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "documents",
          localField: "_id",
          foreignField: "referenceId",
          as: "documents"
        }
      }
    ]).toArray();

    if (noc[0]) return res.json({ success: true, record: noc[0] });

    // ---------- NOT FOUND ----------
    return res.status(404).json({
      success: false,
      message: "Record not found in any service model"
    });

  } catch (err) {
    console.error("getServiceById error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export {
  getAllServices,
  getClientServicesWithDetails,
  getServiceById
}