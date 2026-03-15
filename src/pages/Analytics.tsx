import {
  Lock,
  Eye,
  QrCode,
  ShoppingCart,
  ListOrdered,
} from "lucide-react";
import { Card, CardContent } from "ada-design-system";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTranslation } from "../i18n";

const viewsData = [
  { day: "Mon", views: 120 },
  { day: "Tue", views: 185 },
  { day: "Wed", views: 210 },
  { day: "Thu", views: 165 },
  { day: "Fri", views: 290 },
  { day: "Sat", views: 340 },
  { day: "Sun", views: 275 },
];

const popularMenusData = [
  { name: "Lunch Special", views: 482 },
  { name: "Weekend Brunch", views: 371 },
  { name: "Dinner Menu", views: 298 },
  { name: "Happy Hour", views: 215 },
  { name: "Kids Menu", views: 142 },
];

const qrScansData = [
  { name: "Bella Italia", value: 385 },
  { name: "Sakura Sushi", value: 270 },
  { name: "Le Bistro", value: 195 },
  { name: "Taco Loco", value: 150 },
];

const ordersData = [
  { day: "Mon", orders: 45 },
  { day: "Tue", orders: 62 },
  { day: "Wed", orders: 78 },
  { day: "Thu", orders: 55 },
  { day: "Fri", orders: 95 },
  { day: "Sat", orders: 110 },
  { day: "Sun", orders: 88 },
];

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd"];

export default function Analytics() {
  const { t } = useTranslation();

  const stats = [
    { label: t("analytics.totalViews"), value: "1,585", icon: Eye, color: "text-blue-500" },
    { label: t("analytics.qrScans"), value: "1,000", icon: QrCode, color: "text-violet-500" },
    { label: t("analytics.totalOrders"), value: "533", icon: ShoppingCart, color: "text-emerald-500" },
    { label: t("analytics.avgItemsPerOrder"), value: "3.2", icon: ListOrdered, color: "text-amber-500" },
  ];

  return (
    <div className="h-full overflow-y-auto bg-muted/30">
      {/* Header */}
      <header className="h-14 flex items-center px-6 bg-background border-b border-border sticky top-0 z-10">
        <h1 className="text-lg font-bold text-foreground">{t("analytics.title")}</h1>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Stat cards with lock icons */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="absolute top-3 right-3">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
                </div>
                <stat.icon className={`h-7 w-7 ${stat.color} mb-2`} />
                <p className="text-2xl font-bold text-foreground/30 blur-[2px] select-none">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts with lock overlay */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            {/* Blurred charts grid */}
            <div className="blur-[6px] pointer-events-none select-none opacity-60">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Line Chart */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{t("analytics.menuViews")}</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={viewsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="views" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Bar Chart */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{t("analytics.mostPopularMenus")}</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={popularMenusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="views" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie Chart */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{t("analytics.qrScansByRestaurant")}</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={qrScansData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                      >
                        {qrScansData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Area Chart */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{t("analytics.ordersOverTime")}</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={ordersData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <defs>
                        <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} fill="url(#ordersGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Lock overlay centered on charts */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted/80 mx-auto mb-3">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground">{t("analytics.premiumAnalytics")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("analytics.detailedInsights")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon banner */}
        <div className="rounded-2xl bg-gradient-to-r from-primary to-primary/80 px-6 py-6 text-center text-primary-foreground shadow-lg">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 mx-auto mb-3">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold">{t("analytics.comingSoon")}</h2>
          <p className="text-sm mt-1 opacity-90 max-w-md mx-auto">
            {t("analytics.description")}
          </p>
        </div>
      </main>
    </div>
  );
}
