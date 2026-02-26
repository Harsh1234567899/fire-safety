import {
    LayoutDashboard,
    FilePlus,
    Users,
    BarChart3,
    MessageSquare,
    Settings,
    UserCog
} from "lucide-react"

export const SIDEBAR_ITEMS = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", roles: ["admin"] },
    { label: "Register Firm", icon: FilePlus, path: "/register", roles: ["admin", "manager", "godown-manager"] },
    { label: "Clients", icon: Users, path: "/clients", roles: ["admin", "manager", "godown-manager"] },
    { label: "Reports", icon: BarChart3, path: "/reports", roles: ["admin", "manager"] },
    { label: "Manager Console", icon: MessageSquare, path: "/console", roles: ["admin", "manager"] },
    { label: "Settings", icon: Settings, path: "/settings", roles: ["admin"] },
    { label: "Employee", icon: UserCog, path: "/staff", roles: ["admin"] }
]

// EMPTY INITIAL STATE
export const MOCK_CLIENT_ITEMS = []
export const MOCK_NOTIFICATIONS = []
export const MOCK_REPORT_ITEMS = []
export const MOCK_FOLLOW_UP_ITEMS = []
export const MOCK_ACTIVITY_LOG = []

// Calculate dashboard data (Initial State: All Zeros)
const calculateDashboardData = clients => {
    return {
        metrics: {
            totalClients: 0,
            expiredRecords: 0,
            critical7Day: 0,
            warning30Day: 0
        },
        provisions: {
            cylinders: 0,
            fireNoc: 0,
            amcContracts: 0
        },
        compliance: [
            { name: "Expired", value: 0, fill: "#ef4444" },
            { name: "Expiring 1W", value: 0, fill: "#f97316" },
            { name: "Expiring 1M", value: 0, fill: "#eab308" },
            { name: "Active", value: 0, fill: "#22c55e" }
        ],
        assets: [
            { name: "Cylinders", value: 0, fill: "#f59e0b" },
            { name: "NOCS", value: 0, fill: "#6366f1" },
            { name: "AMCS", value: 0, fill: "#a855f7" }
        ],
        regional: []
    }
}

export const MOCK_DATA = calculateDashboardData([])

export const MOCK_STAFF_DATA = [
    {
        id: "s1",
        systemId: "admin01",
        password: "admin123",
        name: "Chief Admin",
        email: "admin@company.com",
        role: "ADMIN",
        status: "ACTIVE ACCESS",
        initial: "A"
    },
    {
        id: "s2",
        systemId: "manager01",
        password: "manager123",
        name: "Operations Manager",
        email: "ops@company.com",
        role: "MANAGER",
        status: "ACTIVE ACCESS",
        initial: "M"
    },
    {
        id: "s3",
        systemId: "godown01",
        password: "godown123",
        name: "Stock Handler",
        email: "godown@company.com",
        role: "GO DOWN MANAGER",
        status: "ACTIVE ACCESS",
        initial: "G"
    }
]

export const MOCK_GAS_SETTINGS = [
    { id: "1", name: "CO2", description: "4.5 KG", type: "GAS" },
    { id: "2", name: "ABC Powder", description: "6 KG", type: "GAS" },
    { id: "3", name: "Clean Agent", description: "2 KG", type: "GAS" },
    { id: "4", name: "Water Mist", description: "9 LTR", type: "GAS" },
    { id: "5", name: "Mechanical Foam", description: "9 LTR", type: "GAS" }
]

export const MOCK_NOC_SETTINGS = [
    { id: "1", name: "Final NOC", type: "NOC" },
    { id: "2", name: "Provisional NOC", type: "NOC" },
    { id: "3", name: "Renewal NOC", type: "NOC" },
    { id: "4", name: "Occupancy Certificate", type: "NOC" }
]

export const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e"]
