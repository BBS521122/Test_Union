<template>
  <div class="app">
    <MindMap
        :data="mindmapData"
        :width="1000"
        :height="700"
        :colors="customColors"
        :max-depth="3"
        :auto-fit="true"
    />
  </div>
</template>

<script>
import MindMap from '../components/Mindmap.vue';

export default {
  components: {
    MindMap
  },
  data() {
    return {
      mindmapData:
          {"id":"JWT安全改造方案","children":[{"id":"加密算法改进","children":[{"id":"算法选择","children":[{"id":"强制使用RS256"},{"id":"弃用HS256对称加密"},{"id":"非对称密钥管理"}]},{"id":"密钥存储","children":[{"id":"AWSKMS服务"},{"id":"禁用硬编码密钥"},{"id":"HSM硬件加密模块"}]}]},{"id":"Token管理策略","children":[{"id":"有效期控制","children":[{"id":"缩短至1小时"},{"id":"动态过期时间"},{"id":"RefreshToken机制"}]},{"id":"失效机制","children":[{"id":"黑名单数据库"},{"id":"DPoP设备绑定"},{"id":"密钥紧急轮换"}]}]},{"id":"Payload规范","children":[{"id":"内容限制","children":[{"id":"仅含userID"},{"id":"移除敏感数据"},{"id":"最小化声明集"}]},{"id":"编码处理","children":[{"id":"强制签名验证"},{"id":"敏感字段加密"},{"id":"Base64URL检查"}]}]},{"id":"开发流程控制","children":[{"id":"代码审计","children":[{"id":"JWT扫描工具集成"},{"id":"安全团队强制评审"},{"id":"OWASP标准检测"}]},{"id":"培训计划","children":[{"id":"JWT安全误区培训"},{"id":"RFC规范解读"},{"id":"攻击案例复盘"}]}]},{"id":"监控与应急","children":[{"id":"异常检测","children":[{"id":"异常Token频率监控"},{"id":"权限提升告警"},{"id":"密钥使用审计"}]},{"id":"响应措施","children":[{"id":"自动吊销机制"},{"id":"服务熔断预案"},{"id":"取证日志记录"}]}]}]},
      customColors: [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
        '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
      ]
    };
  }
};
</script>

};
