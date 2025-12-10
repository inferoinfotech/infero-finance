// Reminder notification service for expense reminders

interface ExpenseReminder {
  _id: string
  name: string
  amount: number
  reminderDate: string
  reminder?: string
}

// Request browser notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications")
    return false
  }

  if (Notification.permission === "granted") {
    return true
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission()
    return permission === "granted"
  }

  return false
}

// Show a notification
export function showReminderNotification(expense: ExpenseReminder) {
  if (Notification.permission !== "granted") {
    return
  }

  const title = "Payment Reminder"
  const body = `${expense.reminder || "Reminder"}: ${expense.name} - ₹${expense.amount.toLocaleString()}`

  new Notification(title, {
    body,
    icon: "/favicon.ico", // You can add a custom icon
    badge: "/favicon.ico",
    tag: `expense-reminder-${expense._id}`, // Prevent duplicate notifications
    requireInteraction: false,
  })
}

// Check for reminders that are due today
export function checkRemindersToday(expenses: ExpenseReminder[]): ExpenseReminder[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return expenses.filter((expense) => {
    if (!expense.reminderDate) return false

    const reminderDate = new Date(expense.reminderDate)
    reminderDate.setHours(0, 0, 0, 0)

    // Check if reminder date is today
    return reminderDate.getTime() === today.getTime()
  })
}

// Initialize reminder checking
export async function initializeReminderChecker(
  getExpenses: () => Promise<ExpenseReminder[]>,
  checkIntervalMinutes: number = 60
) {
  // Request permission on initialization
  await requestNotificationPermission()

  // Check immediately
  checkAndNotifyReminders(getExpenses)

  // Set up interval to check periodically
  const intervalMs = checkIntervalMinutes * 60 * 1000
  setInterval(() => {
    checkAndNotifyReminders(getExpenses)
  }, intervalMs)
}

// Check reminders and show notifications
async function checkAndNotifyReminders(getExpenses: () => Promise<ExpenseReminder[]>) {
  try {
    const expenses = await getExpenses()
    const dueReminders = checkRemindersToday(expenses)

    if (dueReminders.length === 0 || Notification.permission !== "granted") {
      return
    }

    // Get list of expenses we've already notified today
    const notifiedToday = JSON.parse(
      localStorage.getItem("notifiedRemindersToday") || "[]"
    ) as string[]
    const today = new Date().toDateString()
    const lastCheckDate = localStorage.getItem("lastReminderCheckDate")

    // Clear old notifications if it's a new day
    if (lastCheckDate !== today) {
      localStorage.setItem("notifiedRemindersToday", "[]")
      localStorage.setItem("lastReminderCheckDate", today)
    }

    // Show notifications for due reminders that haven't been notified yet
    dueReminders.forEach((expense) => {
      if (!notifiedToday.includes(expense._id)) {
        showReminderNotification(expense)
        notifiedToday.push(expense._id)
      }
    })

    // Save updated list
    if (notifiedToday.length > 0) {
      localStorage.setItem("notifiedRemindersToday", JSON.stringify(notifiedToday))
    }
  } catch (error) {
    console.error("Error checking reminders:", error)
  }
}

