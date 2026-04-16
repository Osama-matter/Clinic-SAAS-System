import api from "./api";

const saasAdminService = {
  getStats: () => api.get("/SaaSAdmin/stats"),
  getRevenueAnalytics: () => api.get("/SaaSAdmin/analytics/revenue"),
  getUsageMetrics: () => api.get("/SaaSAdmin/usage"),
  getTransactions: (page = 1, pageSize = 20) => 
    api.get(`/SaaSAdmin/transactions?page=${page}&pageSize=${pageSize}`),
  updateSubscription: (command) => api.put("/SaaSAdmin/subscription", command),
};

export default saasAdminService;
