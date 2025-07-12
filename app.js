// app.js
App({
  globalData: {
    apiBase: 'https://my-api.com',
    // 模拟数据
    mockNews: [
      {
        id: 1,
        title: "2023年度电子质量管理协会大会圆满召开",
        summary: "本次大会汇聚了行业顶尖专家，共同探讨电子产品质量管理的最新趋势和技术发展...",
        content: "<p>2023年10月15日，中国电子质量管理协会年度大会在北京国际会议中心隆重召开...</p><img src='https://example.com/image1.jpg'/><p>大会由协会秘书长张某某主持...</p>",
        image_path: "https://example.com/cover1.jpg",
        created_Time: "2023-10-16",
        viewCount: 156
      },
      {
        id: 2,
        title: "电子产品质量标准最新修订",
        summary: "协会发布了最新版的电子产品质量管理标准，将于明年正式实施...",
        content: "<p>新版标准主要针对智能终端设备的可靠性测试提出了更高要求...</p>",
        image_path: "https://example.com/cover2.jpg",
        created_Time: "2023-09-28",
        viewCount: 89
      }
    ]
  },

  // 模拟获取新闻列表
  getNewsList({ page, pageSize, keyword }) {
    let list = this.globalData.mockNews
    
    if (keyword) {
      list = list.filter(item => 
        item.title.includes(keyword) || 
        item.summary.includes(keyword))
    }
    
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return {
      data: list.slice(start, end),
      total: list.length
    }
  },

  // 模拟获取新闻详情
  getNewsDetail(id) {
    const news = this.globalData.mockNews.find(item => item.id == id)
    return {
      data: news || null
    }
  }
})