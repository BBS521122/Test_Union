const app = getApp()

Page({
  data: {
    allNewsList: [], // 存储所有原始数据
    newsList: [],    // 存储当前显示的数据
    searchKeyword: '',
    loading: false,
    refreshing: false
  },

  onLoad() {
    this.loadNews()
  },

  // 初始加载动态数据（仅调用一次）
  loadNews() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    wx.request({
      url: 'https://172.22.126.152:8443/api/news/wxGet',
      method: 'GET',
      success: (res) => {
        console.log('API响应:', res)
        
        if (res.statusCode === 200 && res.data.code == 200 && res.data.data) {
          let newList = res.data.data
          
          // 数据处理：根据实际API返回的数据结构进行字段映射
          newList = newList.map(item => ({
            id: item.id,
            title: item.title || '无标题',
            summary: item.summary || '无摘要',
            content: item.content || '',
            cover: item.imagePath ? `/images/news${item.imagePath.replace('/media', '')}` : '/images/news/default-cover.jpg',
            author: item.author || '匿名',
            createdTime: this.formatTime(item.createdTime) || '未知时间',
            updatedTime: this.formatTime(item.updatedTime) || '',
            status: item.status || '未知状态',
            sortOrder: item.sortOrder || 0
          }))
          
          this.setData({
            allNewsList: newList, // 保存所有原始数据
            newsList: newList,    // 显示所有数据
            loading: false,
            refreshing: false
          })
          
          // 将所有数据也存储到本地，供详情页使用
          wx.setStorageSync('allNewsList', newList)
        } else {
          console.error('API返回数据格式错误:', res)
          this.handleError('数据格式错误')
        }
      },
      fail: (error) => {
        console.error('请求失败:', error)
        this.handleError('网络请求失败')
      }
    })
  },

  // 本地搜索过滤
  filterNews(keyword) {
    if (!keyword) {
      // 没有关键词时显示所有数据
      this.setData({
        newsList: this.data.allNewsList
      })
      return
    }
    
    // 在标题、摘要、内容、作者中搜索关键词
    const filteredList = this.data.allNewsList.filter(item => {
      return item.title.toLowerCase().includes(keyword.toLowerCase()) ||
             item.summary.toLowerCase().includes(keyword.toLowerCase()) ||
             item.content.toLowerCase().includes(keyword.toLowerCase()) ||
             item.author.toLowerCase().includes(keyword.toLowerCase())
    })
    
    this.setData({
      newsList: filteredList
    })
  },

  // 时间格式化函数
  formatTime(timeString) {
    if (!timeString) return ''
    
    try {
      const date = new Date(timeString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      
      return `${year}-${month}-${day} ${hours}:${minutes}`
    } catch (error) {
      console.error('时间格式化错误:', error)
      return timeString
    }
  },

  // 错误处理
  handleError(message) {
    this.setData({
      loading: false,
      refreshing: false
    })
    
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    })
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value.trim() })
  },

  // 执行搜索（本地搜索）
  onSearch() {
    this.filterNews(this.data.searchKeyword)
  },

  // 下拉刷新（重新从后端获取数据）
  onRefresh() {
    this.setData({
      refreshing: true,
      searchKeyword: '' // 清空搜索关键词
    })
    this.loadNews()
  },

  // 跳转到详情页
  navigateToDetail(e) {
    const id = e.currentTarget.dataset.id
    if (id) {
      // 找到对应的新闻数据
      const newsItem = this.data.newsList.find(item => item.id == id)
      if (newsItem) {
        // 将新闻数据存储到本地，然后跳转
        wx.setStorageSync('currentNewsDetail', newsItem)
        wx.navigateTo({
          url: `/pages/news-detail/index?id=${id}`
        })
      }
    }
  },

  // 跳转到管理端
  goToAdmin() {
    wx.navigateTo({
      url: '/pages/admin/index'
    })
  }
})