Page({
  data: {
    isLogin: false,
    account: '',
    password: '',
    loginError: false,
    stats: []
  },
  onAccountInput(e) {
    this.setData({ account: e.detail.value })
  },
  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },
  onLogin() {
    if (this.data.account === 'admin' && this.data.password === '123456') {
      this.setData({ isLogin: true, loginError: false })
      this.loadStats()
    } else {
      this.setData({ loginError: true })
    }
  },
  onLogout() {
    this.setData({ isLogin: false, account: '', password: '', loginError: false })
  },
  loadStats() {
    // 从本地缓存获取浏览量统计
    const stats = wx.getStorageSync('newsViewStats') || []
    this.setData({ stats })
  },
  onShow() {
    if (this.data.isLogin) {
      this.loadStats()
    }
  }
}) 