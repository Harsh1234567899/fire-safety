import { ApiResponse } from "../utils/ApiResponse.js";
import { AMC } from '../models/AMC.model.js'
import { gasSilinder } from '../models/gasSilinder.model.js'
import { fireNOC } from '../models/fireNOC.model.js'
import { client } from "../models/client.model.js";

export async function getDashboardCounts(req, res) {
  try {
    // Option A: simple & explicit (recommended for clarity)
    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      clientsCount,
      amcCounts,
      feCounts,
      nocCounts,
      regionalDensity
    ] = await Promise.all([
      // clients
      client.countDocuments({}),

      // AMC counts by expiry
      (async () => {
        const total = await AMC.countDocuments({});
        const expired = await AMC.countDocuments({ endDate: { $lt: now } });
        const critical = await AMC.countDocuments({ endDate: { $gte: now, $lte: next7Days } });
        const warning = await AMC.countDocuments({ endDate: { $gt: next7Days, $lte: next30Days } });
        const ongoing = total - expired;
        return { total, ongoing, expired, critical, warning };
      })(),

      // Fire Extinguisher counts by expiry
      (async () => {
        const total = await gasSilinder.countDocuments({});
        const expired = await gasSilinder.countDocuments({ endDate: { $lt: now } });
        const critical = await gasSilinder.countDocuments({ endDate: { $gte: now, $lte: next7Days } });
        const warning = await gasSilinder.countDocuments({ endDate: { $gt: next7Days, $lte: next30Days } });
        const ongoing = total - expired;
        return { total, ongoing, expired, critical, warning };
      })(),

      // Fire NOC counts by expiry
      (async () => {
        const total = await fireNOC.countDocuments({});
        const expired = await fireNOC.countDocuments({ endDate: { $lt: now } });
        const critical = await fireNOC.countDocuments({ endDate: { $gte: now, $lte: next7Days } });
        const warning = await fireNOC.countDocuments({ endDate: { $gt: next7Days, $lte: next30Days } });
        const ongoing = total - expired;
        return { total, ongoing, expired, critical, warning };
      })(),

      // Regional Density (Clients grouped by City)
      (async () => {
        const regions = await client.aggregate([
          { $group: { _id: "$city", value: { $sum: 1 } } },
          { $project: { _id: 0, name: "$_id", value: 1 } },
          { $sort: { value: -1 } },
          { $limit: 7 }
        ]);
        // Handle empty or missing cities map to 'Unknown'
        return regions.map(r => ({ name: r.name ? r.name.trim() : 'Unknown', value: r.value }));
      })()
    ]);

    // Example response shape
    return res.status(200).json(new ApiResponse(200, {
      clientsCount,
      amc: amcCounts,
      fireExtinguishers: feCounts,
      fireNOCs: nocCounts,
      regional: regionalDensity
    }, "all data"));
  } catch (err) {
    console.error("Error in getDashboardCounts:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function aggregateMonthlyStatusByExpiry(Model, year) {
  const now = new Date();

  // compute start and end for the year
  const yearStart = new Date(year, 0, 1); // Jan 1, 00:00
  const yearEnd = new Date(year + 1, 0, 1); // Jan 1 next year

  // aggregation:
  // 1) match expiryDate within the year range
  // 2) project month number and isExpired flag (based on comparison to "now")
  // 3) group by month and status to sum
  // 4) reshape to { monthNum, status, count }
  const pipeline = [
    {
      $match: {
        expiryDate: { $gte: yearStart, $lt: yearEnd },
      },
    },
    {
      $project: {
        month: { $month: "$expiryDate" }, // 1-12
        isExpired: { $cond: [{ $lt: ["$expiryDate", now] }, "expired", "ongoing"] },
      },
    },
    {
      $group: {
        _id: { month: "$month", status: "$isExpired" },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        month: "$_id.month",
        status: "$_id.status",
        count: 1,
      },
    },
    {
      $sort: { month: 1 },
    },
  ];

  const agg = await Model.aggregate(pipeline).allowDiskUse(true);

  // prepare 12-bucket result
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const buckets = monthNames.map((name, idx) => ({ month: name, ongoing: 0, expired: 0 }));

  // fill buckets from aggregation
  for (const row of agg) {
    const mIdx = row.month - 1; // month from 1-12 -> index 0-11
    if (mIdx >= 0 && mIdx < 12) {
      if (row.status === "ongoing") buckets[mIdx].ongoing = row.count;
      else if (row.status === "expired") buckets[mIdx].expired = row.count;
    }
  }

  return buckets;
}


export async function getMonthlyServiceStatus(req, res) {
  try {
    const yearParam = parseInt(req.query.year, 10);
    const now = new Date();
    const year = Number.isFinite(yearParam) && yearParam > 1970 ? yearParam : now.getFullYear();

    // run all three aggregations in parallel
    const [amc, fireExtinguishers, fireNOCs] = await Promise.all([
      aggregateMonthlyStatusByExpiry(AMC, year),
      aggregateMonthlyStatusByExpiry(gasSilinder, year),
      aggregateMonthlyStatusByExpiry(fireNOC, year),
    ]);

    return res.status(200).json(new ApiResponse(200, { year, amc, fireExtinguishers, fireNOCs }, "all data fatched"));
  } catch (err) {
    console.error("Error in getMonthlyServiceStatus:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}