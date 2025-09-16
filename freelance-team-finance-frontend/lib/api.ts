const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

class ApiClient {
  private getAuthHeaders() {
    const token = localStorage.getItem("token")
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    const config = {
      headers: this.getAuthHeaders(),
      ...options,
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("API request failed:", error)
      throw error
    }
  }

  // Auth endpoints
  async login(credentials: { email: string; password: string }) {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    })
  }

  async register(userData: { name: string; email: string; password: string }) {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    })
  }

  // Projects endpoints
  async getProjects() {
    return this.request("/api/projects")
  }

  async getProject(projectId: string) {
    return this.request(`/api/projects/${projectId}`)
  }

  async createProject(projectData: any) {
    return this.request("/api/projects", {
      method: "POST",
      body: JSON.stringify(projectData),
    })
  }

  async updateProject(projectId: string, projectData: any) {
    return this.request(`/api/projects/${projectId}`, {
      method: "PUT",
      body: JSON.stringify(projectData),
    })
  }

  async deleteProject(projectId: string) {
    return this.request(`/api/projects/${projectId}`, {
      method: "DELETE",
    })
  }

  // Summary endpoints
  async getTeamSummary() {
    return this.request("/api/summary/team")
  }

  async getUserSummary() {
    return this.request("/api/summary/user")
  }

  // Expenses endpoints
  async getExpenses() {
    return this.request("/api/expenses")
  }

  async createExpense(expenseData: any) {
    return this.request("/api/expenses", {
      method: "POST",
      body: JSON.stringify(expenseData),
    })
  }

  // Accounts endpoints
  async getAccounts() {
    return this.request("/api/accounts")
  }

  async createAccount(accountData: any) {
    return this.request("/api/accounts", {
      method: "POST",
      body: JSON.stringify(accountData),
    })
  }

  async getAccountStatement(accountId: string) {
    // Returns shape like:
    // { account: {...}, txns: [ ... ] }
    return this.request(`/api/accounts/${accountId}/statement`)
  }

  // Platforms endpoints
  async getPlatforms() {
    return this.request("/api/platforms")
  }

  async createPlatform(platformData: any) {
    return this.request("/api/platforms", {
      method: "POST",
      body: JSON.stringify(platformData),
    })
  }

  // Notifications endpoints
  async getNotifications() {
    return this.request("/api/notifications")
  }

  async markNotificationAsRead(notificationId: string) {
    return this.request(`/api/notifications/${notificationId}/read`, {
      method: "PUT",
    })
  }

  // History endpoint
  async getHistory() {
    return this.request("/api/history")
  }

  async getProjectPayments(projectId: string) {
    return this.request(`/api/project-payments/project/${projectId}`)
  }

  async createProjectPayment(paymentData: any) {
    return this.request("/api/project-payments", {
      method: "POST",
      body: JSON.stringify(paymentData),
    })
  }

  async updateProjectPayment(paymentId: string, paymentData: any) {
    return this.request(`/api/project-payments/${paymentId}`, {
      method: "PUT",
      body: JSON.stringify(paymentData),
    })
  }
  // lib/api.ts (inside ApiClient class)

// Reports endpoints
async getIncomeReport(groupBy: "month" | "day" = "month") {
  return this.request(`/api/reports/income?groupBy=${groupBy}`)
}

async getExpensesReport(groupBy: "month" | "day" = "month") {
  return this.request(`/api/reports/expenses?groupBy=${groupBy}`)
}

async getGeneralExpensesReport(groupBy: "month" | "day" = "month") {
  return this.request(`/api/reports/general-expenses?groupBy=${groupBy}`)
}


  async deleteProjectPayment(paymentId: string) {
    return this.request(`/api/project-payments/${paymentId}`, {
      method: "DELETE",
    })
  }

  async getHourlyWorkEntries(projectId: string) {
    // Returns: { logs: HourlyWorkLog[] }
    const data = await this.request(`/api/hourly-work/project/${projectId}`)
    return data.logs || []
  }

  async createHourlyWork(entry: { project: string; weekStart: string; hours: number }) {
    return this.request("/api/hourly-work", {
      method: "POST",
      body: JSON.stringify(entry),
    })
  }

  async updateHourlyWork(logId: string, update: { hours: number }) {
    return this.request(`/api/hourly-work/${logId}`, {
      method: "PUT",
      body: JSON.stringify(update),
    })
  }

  async deleteHourlyWork(logId: string) {
    return this.request(`/api/hourly-work/${logId}`, { method: "DELETE" })
  }


  // ------- Leads -------
  async createLead(data: any) {
    return this.request("/api/leads", { method: "POST", body: JSON.stringify(data) })
  }
  async getLeads(params?: {
    q?: string; stage?: string; priority?: string; platform?: string; assignedTo?: string;
    nextFrom?: string; nextTo?: string; page?: number; limit?: number;
  }) {
    const qs = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && `${v}`.length) qs.append(k, `${v}`)
      })
    }
    return this.request(`/api/leads?${qs.toString()}`)
  }
  async getLead(leadId: string) {
    return this.request(`/api/leads/${leadId}`)
  }
  async updateLead(leadId: string, data: any) {
    return this.request(`/api/leads/${leadId}`, { method: "PUT", body: JSON.stringify(data) })
  }
  async deleteLead(leadId: string) {
    return this.request(`/api/leads/${leadId}`, { method: "DELETE" })
  }
  async addFollowUp(leadId: string, data: { date: string; clientResponse?: string; notes?: string; nextFollowUpDate?: string }) {
    return this.request(`/api/leads/${leadId}/follow-ups`, { method: "POST", body: JSON.stringify(data) })
  }

  // ------- Users -------
  async getUsers(params?: { search?: string; page?: number; limit?: number }) {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.page)   qs.set('page', String(params.page))
    if (params?.limit)  qs.set('limit', String(params.limit))
    return this.request(`/api/auth/users${qs.toString() ? `?${qs}` : ''}`)
  }

  async createUser(payload: { name: string; email: string; password: string; role: 'admin'|'owner'|'sales'|'developer' }) {
    return this.request('/api/auth/users', { method: 'POST', body: JSON.stringify(payload) })
  }

  async updateUser(id: string, payload: Partial<{ name: string; email: string; password: string; role: 'admin'|'owner'|'sales'|'developer' }>) {
    return this.request(`/api/auth/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  }

  async deleteUser(id: string) {
    return this.request(`/api/auth/users/${id}`, { method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()
