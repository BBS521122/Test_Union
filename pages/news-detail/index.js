const app = getApp()

Page({
  data: {
    newsDetail: {},
    nodes: '',
    loading: true,
    error: '',
    newsId: null
  },

  onLoad(options) {
    console.log('详情页接收到的参数：', options)
    if (options.id) {
      this.setData({ newsId: options.id })
      this.loadNewsDetailFromStorage(options.id)
    } else {
      this.setData({ 
        error: '缺少新闻ID参数',
        loading: false 
      })
    }
  },

  // 从本地存储加载新闻详情
  loadNewsDetailFromStorage(id) {
    console.log('从本地存储加载详情，id：', id)
    
    this.setData({ 
      loading: true, 
      error: '' 
    })
    
    try {
      // 首先尝试获取当前新闻详情（从列表页传递过来的）
      let newsItem = wx.getStorageSync('currentNewsDetail')
      
      // 如果没有找到，或者ID不匹配，则从所有新闻列表中查找
      if (!newsItem || newsItem.id != id) {
        const allNewsList = wx.getStorageSync('allNewsList') || []
        newsItem = allNewsList.find(item => item.id == id)
      }
      
      if (newsItem) {
        this.processNewsDetail(newsItem)
      } else {
        this.setData({
          error: '未找到对应的新闻内容，请返回列表页重新进入',
          loading: false
        })
      }
    } catch (error) {
      console.error('读取本地数据失败:', error)
      this.setData({
        error: '读取数据失败，请返回列表页重新进入',
        loading: false
      })
    }
  },

  // 处理新闻详情数据
  processNewsDetail(newsData) {
    // 数据处理：根据数据结构进行字段映射
    const detail = {
      id: newsData.id,
      title: newsData.title || '无标题',
      summary: newsData.summary || '无摘要',
      content: newsData.content || '',
      cover: newsData.cover || '', // 直接使用已处理过的封面路径
      author: newsData.author || '匿名',
      createdTime: newsData.createdTime || '未知时间',
      updatedTime: newsData.updatedTime || '',
      status: newsData.status || '未知状态',
      sortOrder: newsData.sortOrder || 0
    }

    // 统计浏览量
    this.updateViewCount(detail)

    // 处理富文本内容
    const processedContent = this.formatRichText(detail.content)

    this.setData({
      newsDetail: detail,
      nodes: processedContent,
      loading: false,
      error: ''
    })
  },

  // 更新浏览量统计
  updateViewCount(detail) {
    try {
      let stats = wx.getStorageSync('newsViewStats') || []
      let found = false
      let currentViewCount = 0

      for (let i = 0; i < stats.length; i++) {
        if (stats[i].id == detail.id) {
          stats[i].viewCount = (stats[i].viewCount || 0) + 1
          stats[i].lastViewTime = new Date().toISOString()
          currentViewCount = stats[i].viewCount
          found = true
          break
        }
      }

      if (!found) {
        stats.push({ 
          id: detail.id, 
          title: detail.title, 
          viewCount: 1,
          firstViewTime: new Date().toISOString(),
          lastViewTime: new Date().toISOString()
        })
        currentViewCount = 1
      }

      wx.setStorageSync('newsViewStats', stats)
      detail.viewCount = currentViewCount
    } catch (error) {
      console.error('更新浏览量失败:', error)
      detail.viewCount = 0
    }
  },

  // 格式化富文本内容
  formatRichText(html) {
    if (!html) return ''
    
    // 处理后端返回的 HTML 片段，兼容 <video><source></video> 格式
    html = html.replace(/<video[^>]*>\s*<source\s+src=['"]([^'"]+)['"][^>]*[^>]*>\s*<\/video>/gi, 
      (match, src) => {
        // 处理视频路径 - 如果使用本地资源需要相应调整
        let fullSrc = src
        if (src.startsWith('/media/')) {
          fullSrc = `/videos${src.replace('/media', '')}`  // 本地视频路径
        }
        return `<video src="${fullSrc}" controls style="max-width:100%;height:auto"></video>`
      })
    
    // 处理图片路径 - 使用本地图片
    html = html.replace(/<img[^>]+src=['"]([^'"]+)['"][^>]*>/gi, (match, src) => {
      let fullSrc = src
      if (src.startsWith('/media/')) {
        fullSrc = `/images/news${src.replace('/media', '')}`  // 本地图片路径
      }
      return match.replace(src, fullSrc).replace(/<img/gi, '<img style="max-width:100%;height:auto;display:block;margin:10px 0" ')
    })
    
    // 处理视频标签
    html = html.replace(/<video/gi, '<video style="max-width:100%;height:auto;display:block;margin:10px 0" ')
    
    // 处理链接在小程序中的显示
    html = html.replace(/<a\s+[^>]*href=['"]([^'"]+)['"][^>]*>([^<]+)<\/a>/gi, 
      '<text style="color:#007aff;text-decoration:underline">$2</text>')
    
    return html
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

  // 返回列表页
  goBack() {
    wx.navigateBack()
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: this.data.newsDetail.title || '新闻详情',
      path: `/pages/news-detail/index?id=${this.data.newsDetail.id}`,
      imageUrl: this.data.newsDetail.cover
    }
  }
})