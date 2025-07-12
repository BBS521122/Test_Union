<template>
  <div class="mindmap-container">
    <div ref="mindmapContainer" class="mindmap-canvas"></div>
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Loading mindmap...</p>
    </div>
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script>
import { Rect, Text } from '@antv/g';
import {
  Badge,
  BaseBehavior,
  BaseNode,
  BaseTransform,
  CommonEvent,
  CubicHorizontal,
  ExtensionCategory,
  Graph,
  GraphEvent,
  iconfont,
  idOf,
  NodeEvent,
  positionOf,
  register,
  treeToGraphData,
} from '@antv/g6';

export default {
  name: 'MindMap',
  props: {
    data: {
      type: Object,
      required: true,
      validator(value) {
        return value && value.id;
      }
    },
    width: {
      type: Number,
      default: 800
    },
    height: {
      type: Number,
      default: 600
    },
    colors: {
      type: Array,
      default: () => [
        '#1783FF', '#F08F56', '#D580FF', '#00C9C9', '#7863FF',
        '#DB9D0D', '#60C42D', '#FF80CA', '#2491B3', '#17C76F'
      ]
    },
    maxDepth: {
      type: Number,
      default: 4  // Root(0) + 3 levels = 4 total depth
    },
    autoFit: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      graph: null,
      loading: false,
      error: null,
      textShape: null,
      // Store non-reactive data for G6
      currentData: null,
      currentColors: [],
      currentRootId: null
    };
  },
  mounted() {
    this.initMindmap();
  },
  beforeUnmount() {
    if (this.graph) {
      this.graph.destroy();
    }
  },
  // watch: {
  //   data: {
  //     handler(newData) {
  //       if (newData && this.graph) {
  //         this.updateMindmap(newData);
  //       }
  //     },
  //     deep: true
  //   },
  //   colors: {
  //     handler(newColors) {
  //       if (newColors && this.graph) {
  //         this.currentColors = [...newColors];
  //         this.updateMindmap(this.data);
  //       }
  //     },
  //     deep: true
  //   }
  // },
  methods: {
    // Convert reactive Vue data to plain JavaScript objects
    toPlainObject(obj) {
      return JSON.parse(JSON.stringify(obj)); // 深度克隆去除响应式
    },

    initMindmap() {
      this.loading = true;
      this.error = null;

      try {
        // Convert reactive data to plain objects
        console.log('data在这里:', this.data)
        this.currentData = this.toPlainObject(this.data);
        this.currentColors = [...this.colors];

        this.setupStyles();
        this.registerComponents();
        this.createGraph();
        this.loading = false;
      } catch (err) {
        this.error = `Failed to initialize mindmap: ${err.message}`;
        this.loading = false;
      }
    },

    setupStyles() {
      const style = document.createElement('style');
      style.innerHTML = `@import url('${iconfont.css}');`;
      document.head.appendChild(style);
    },

    validateAndProcessData(data) {
      if (!data || !data.id) {
        throw new Error('Data must have an id property');
      }

      const processNode = (node, depth = 0) => {
        if (depth > this.maxDepth) {
          return { ...node, children: [] };
        }

        const processedNode = { ...node };
        if (node.children && Array.isArray(node.children)) {
          processedNode.children = node.children.map(child => processNode(child, depth + 1));
        }

        return processedNode;
      };

      return processNode(data);
    },

    measureText(text) {
      if (!this.textShape) {
        this.textShape = new Text({ style: text });
      }
      this.textShape.attr(text);
      return this.textShape.getBBox().width;
    },

    getNodeWidth(nodeId, isRoot) {
      const padding = isRoot ? 40 : 30;
      const fontSize = isRoot ? 24 : 16;
      return this.measureText({
        text: nodeId,
        fontSize,
        fontFamily: 'Gill Sans'
      }) + padding;
    },

    getNodeSize(nodeId, isRoot) {
      const width = this.getNodeWidth(nodeId, isRoot);
      const height = isRoot ? 48 : 32;
      return [width, height];
    },

    getNodeSide(nodeData, parentData) {
      if (!parentData) return 'center';
      const nodePositionX = positionOf(nodeData)[0];
      const parentPositionX = positionOf(parentData)[0];
      return parentPositionX > nodePositionX ? 'left' : 'right';
    },

    registerComponents() {
      const self = this;

      // Root and Node styles
      const RootNodeStyle = {
        fill: '#EFF0F0',
        labelFill: '#262626',
        labelFontSize: 24,
        labelFontWeight: 600,
        labelOffsetY: 8,
        labelPlacement: 'center',
        ports: [{ placement: 'right' }, { placement: 'left' }],
        radius: 8,
      };

      const NodeStyle = {
        fill: 'transparent',
        labelPlacement: 'center',
        labelFontSize: 16,
        ports: [{ placement: 'right-bottom' }, { placement: 'left-bottom' }],
      };

      const TreeEvent = {
        COLLAPSE_EXPAND: 'collapse-expand',
        ADD_CHILD: 'add-child',
      };

      // MindmapNode class
      class MindmapNode extends BaseNode {
        static defaultStyleProps = {
          showIcon: false,
        };

        constructor(options) {
          Object.assign(options.style, MindmapNode.defaultStyleProps);
          super(options);
        }

        get childrenData() {
          return this.context.model.getChildrenData(this.id);
        }

        get rootId() {
          return idOf(this.context.model.getRootsData()[0]);
        }

        isShowCollapse(attributes) {
          const { collapsed, showIcon } = attributes;
          return !collapsed && showIcon && this.childrenData.length > 0;
        }

        getCollapseStyle(attributes) {
          const { showIcon, color, direction } = attributes;
          if (!this.isShowCollapse(attributes)) return false;
          const [width, height] = this.getSize(attributes);

          return {
            backgroundFill: color,
            backgroundHeight: 12,
            backgroundWidth: 12,
            cursor: 'pointer',
            fill: '#fff',
            fontFamily: 'iconfont',
            fontSize: 8,
            text: '\ue6e4',
            textAlign: 'center',
            transform: direction === 'left' ? [['rotate', 90]] : [['rotate', -90]],
            visibility: showIcon ? 'visible' : 'hidden',
            x: direction === 'left' ? -6 : width + 6,
            y: height,
          };
        }

        drawCollapseShape(attributes, container) {
          const iconStyle = this.getCollapseStyle(attributes);
          const btn = this.upsert('collapse-expand', Badge, iconStyle, container);

          this.forwardEvent(btn, CommonEvent.CLICK, (event) => {
            event.stopPropagation();
            this.context.graph.emit(TreeEvent.COLLAPSE_EXPAND, {
              id: this.id,
              collapsed: !attributes.collapsed,
            });
          });
        }

        getCountStyle(attributes) {
          const { collapsed, color, direction } = attributes;
          const count = this.context.model.getDescendantsData(this.id).length;
          if (!collapsed || count === 0) return false;
          const [width, height] = this.getSize(attributes);
          return {
            backgroundFill: color,
            backgroundHeight: 12,
            backgroundWidth: 12,
            cursor: 'pointer',
            fill: '#fff',
            fontSize: 8,
            text: count.toString(),
            textAlign: 'center',
            x: direction === 'left' ? -6 : width + 6,
            y: height,
          };
        }

        drawCountShape(attributes, container) {
          const countStyle = this.getCountStyle(attributes);
          const btn = this.upsert('count', Badge, countStyle, container);

          this.forwardEvent(btn, CommonEvent.CLICK, (event) => {
            event.stopPropagation();
            this.context.graph.emit(TreeEvent.COLLAPSE_EXPAND, {
              id: this.id,
              collapsed: false,
            });
          });
        }

        forwardEvent(target, type, listener) {
          if (target && !Reflect.has(target, '__bind__')) {
            Reflect.set(target, '__bind__', true);
            target.addEventListener(type, listener);
          }
        }

        getKeyStyle(attributes) {
          const [width, height] = this.getSize(attributes);
          const keyShape = super.getKeyStyle(attributes);
          return { width, height, ...keyShape };
        }

        drawKeyShape(attributes, container) {
          const keyStyle = this.getKeyStyle(attributes);
          return this.upsert('key', Rect, keyStyle, container);
        }

        render(attributes = this.parsedAttributes, container = this) {
          super.render(attributes, container);
          this.drawCollapseShape(attributes, container);
          this.drawCountShape(attributes, container);
        }
      }

      // MindmapEdge class
      class MindmapEdge extends CubicHorizontal {
        get rootId() {
          return idOf(this.context.model.getRootsData()[0]);
        }

        getKeyPath(attributes) {
          const path = super.getKeyPath(attributes);
          const isRoot = this.targetNode.id === this.rootId;
          const labelWidth = self.getNodeWidth(this.targetNode.id, isRoot);

          const [, tp] = this.getEndpoints(attributes);
          const sign = this.sourceNode.getCenter()[0] < this.targetNode.getCenter()[0] ? 1 : -1;
          return [...path, ['L', tp[0] + labelWidth * sign, tp[1]]];
        }
      }

      // Modified CollapseExpandTree behavior - DISABLED POINTER MOVE EVENTS
      class CollapseExpandTree extends BaseBehavior {
        constructor(context, options) {
          super(context, options);
          this.bindEvents();
        }

        update(options) {
          this.unbindEvents();
          super.update(options);
          this.bindEvents();
        }

        bindEvents() {
          const { graph } = this.context;
          // REMOVED: Pointer move events that cause high CPU usage
          // graph.on(NodeEvent.POINTER_ENTER, this.showIcon);
          // graph.on(NodeEvent.POINTER_LEAVE, this.hideIcon);
          graph.on(TreeEvent.COLLAPSE_EXPAND, this.onCollapseExpand);
        }

        unbindEvents() {
          const { graph } = this.context;
          // REMOVED: Pointer move events that cause high CPU usage
          // graph.off(NodeEvent.POINTER_ENTER, this.showIcon);
          // graph.off(NodeEvent.POINTER_LEAVE, this.hideIcon);
          graph.off(TreeEvent.COLLAPSE_EXPAND, this.onCollapseExpand);
        }

        status = 'idle';

        // Keep methods but don't bind them to events
        showIcon = (event) => {
          this.setIcon(event, true);
        };

        hideIcon = (event) => {
          this.setIcon(event, false);
        };

        setIcon = (event, show) => {
          if (this.status !== 'idle') return;
          const { target } = event;
          const id = target.id;
          const { graph, element } = this.context;
          graph.updateNodeData([{ id, style: { showIcon: show } }]);
          element.draw({ animation: false, silence: true });
        };

        onCollapseExpand = async (event) => {
          this.status = 'busy';
          const { id, collapsed } = event;
          const { graph } = this.context;
          await graph.frontElement(id);
          if (collapsed) await graph.collapseElement(id);
          else await graph.expandElement(id);
          this.status = 'idle';
        };
      }

      // AssignColorByBranch transform
      class AssignColorByBranch extends BaseTransform {
        constructor(context, options) {
          super(context, { colors: self.currentColors, ...options });
        }

        beforeDraw(input) {
          const nodes = this.context.model.getNodeData();
          if (nodes.length === 0) return input;

          let colorIndex = 0;
          const dfs = (nodeId, color) => {
            const node = nodes.find((datum) => datum.id == nodeId);
            if (!node) return;

            node.style ||= {};
            node.style.color = color || this.options.colors[colorIndex++ % this.options.colors.length];
            node.children?.forEach((childId) => dfs(childId, node.style?.color));
          };

          nodes.filter((node) => node.depth === 1).forEach((rootNode) => dfs(rootNode.id));
          return input;
        }
      }

      // Register components
      register(ExtensionCategory.NODE, 'mindmap', MindmapNode);
      register(ExtensionCategory.EDGE, 'mindmap', MindmapEdge);
      register(ExtensionCategory.BEHAVIOR, 'collapse-expand-tree', CollapseExpandTree);
      register(ExtensionCategory.TRANSFORM, 'assign-color-by-branch', AssignColorByBranch);
    },

    createGraph() {
      const processedData = this.validateAndProcessData(this.currentData);
      const rootId = processedData.id;
      this.currentRootId = rootId;

      // Convert to plain graph data (non-reactive)
      const graphData = treeToGraphData(processedData);

      this.graph = new Graph({
        container: this.$refs.mindmapContainer,
        width: this.width,
        height: this.height,
        data: graphData,
        node: {
          type: 'mindmap',
          style: (d) => {
            const direction = this.getNodeSide(d, this.graph.getParentData(idOf(d), 'tree'));
            const isRoot = idOf(d) === rootId;

            return {
              direction,
              labelText: idOf(d),
              size: this.getNodeSize(idOf(d), isRoot),
              labelFontFamily: 'Gill Sans',
              labelBackground: true,
              labelBackgroundFill: 'transparent',
              labelPadding: direction === 'left' ? [2, 0, 10, 40] : [2, 40, 10, 0],
              // Always show icons since hover events are disabled
              showIcon: true,
              ...(isRoot ? {
                fill: '#EFF0F0',
                labelFill: '#262626',
                labelFontSize: 24,
                labelFontWeight: 600,
                labelOffsetY: 8,
                labelPlacement: 'center',
                ports: [{ placement: 'right' }, { placement: 'left' }],
                radius: 8,
              } : {
                fill: 'transparent',
                labelPlacement: 'center',
                labelFontSize: 16,
                ports: [{ placement: 'right-bottom' }, { placement: 'left-bottom' }],
              }),
            };
          },
        },
        edge: {
          type: 'mindmap',
          style: {
            lineWidth: 3,
            stroke: (data) => {
              return this.graph.getNodeData(data.target).style.color || '#99ADD1';
            },
          },
        },
        layout: {
          type: 'mindmap',
          direction: 'H',
          getHeight: () => 30,
          getWidth: (node) => this.getNodeWidth(node.id, node.id === rootId),
          getVGap: () => 6,
          getHGap: () => 60,
          animation: false,
        },
        behaviors: ['drag-canvas', 'zoom-canvas', 'collapse-expand-tree'],
        transforms: ['assign-color-by-branch'],
        animation: false,
      });

      // Add event listener to disable pointer events on the canvas to prevent CPU spikes
      this.graph.once(GraphEvent.AFTER_RENDER, () => {
        if (this.autoFit) {
          this.graph.fitView();
        }

        // Disable pointer events that cause performance issues
        const canvas = this.$refs.mindmapContainer.querySelector('canvas');
        if (canvas) {
          canvas.style.pointerEvents = 'auto'; // Keep basic interactions
          // Add throttling to prevent excessive event firing
          let throttleTimer = null;
          const originalOnPointerMove = canvas.onpointermove;
          canvas.onpointermove = (event) => {
            if (throttleTimer) return;
            throttleTimer = setTimeout(() => {
              throttleTimer = null;
            }, 16); // Throttle to ~60fps
            if (originalOnPointerMove) {
              originalOnPointerMove.call(canvas, event);
            }
          };
        }
      });

      this.graph.render();
    },

    // updateMindmap(newData) {
    //   try {
    //     // Convert reactive data to plain objects
    //     this.currentData = this.toPlainObject(newData);
    //     this.currentColors = [...this.colors];
    //
    //     const processedData = this.validateAndProcessData(this.currentData);
    //     const graphData = treeToGraphData(processedData);
    //
    //     this.graph.read(graphData);
    //     this.graph.render();
    //
    //     if (this.autoFit) {
    //       this.graph.fitView();
    //     }
    //   } catch (err) {
    //     this.error = `Failed to update mindmap: ${err.message}`;
    //   }
    // }
  }
};
</script>

<style scoped>
.mindmap-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 70%;
}

.mindmap-canvas {
  width: 100%;
  height: 100%;
  /* Disable text selection to prevent unnecessary events */
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1783ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  color: #ff4d4f;
  padding: 16px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  margin: 16px;
}
</style>