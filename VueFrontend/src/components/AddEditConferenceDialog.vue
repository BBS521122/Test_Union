<template>
  <el-dialog v-model="visible" :title="isEdit ? '修改会议' : '添加会议'" width="80%">
    <el-form label-width="100px" :model="form" :rules="rules" ref="formRef">
      <el-form-item label="会议名称" prop="title">
        <el-input v-model="form.title" placeholder="请输入会议标题"/>
      </el-form-item>

      <el-form-item label="会议封面" prop="cover">
        <el-upload
            class="upload-demo"
            :class="{ 'hide-upload': coverList.length > 0 }"
            :limit="1"
            name="file"
            :file-list="coverList"
            :before-upload="beforeCoverUpload"
            :on-change="handleCoverChange"
            :on-remove="handleCoverRemove"
            :on-preview="handlePreview"
            :auto-upload="false"
            list-type="picture-card"
        >
          <template #trigger>
            <i class="el-icon-plus"/>
          </template>
        </el-upload>

        <el-dialog v-model="previewVisible" width="50%" :show-close="true">
          <img :src="previewUrl" alt="预览" style="width: 100%;"/>
        </el-dialog>
        <div class="el-upload__tip" style="color: red">
          建议尺寸为 750x350px，格式为 jpg/jpeg/png，大小不超过2MB
        </div>
      </el-form-item>

      <el-form-item label="会议内容" prop="content">
        <div style="border: 1px solid #ccc;">
          <template v-if="editorMounted">
            <Toolbar :editor="editor" :defaultConfig="toolbarConfig" style="border-bottom: 1px solid #ccc"/>
            <Editor
                :key="editorKey"
                style="height: 300px; overflow-y: auto;"
                v-model="form.content"
                :defaultConfig="editorConfig"
                @onCreated="handleCreated"
            />
          </template>
          <div v-else style="height: 300px; display: flex; align-items: center; justify-content: center; color: #999;">
            编辑器初始化中...
          </div>
        </div>
      </el-form-item>

      <el-form-item label="创建者" prop="owner">
        <el-input v-model="form.owner" readonly/>
      </el-form-item>

      <el-form-item label="开始时间" prop="publishTime">
        <el-date-picker v-model="form.publishTime" type="datetime" style="width: 100%;" placeholder="请选择开始时间"/>
      </el-form-item>

      <el-form-item label="结束时间" prop="expireTime">
        <el-date-picker v-model="form.expireTime" type="datetime" style="width: 100%;" placeholder="请选择结束时间"/>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="submitForm">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import {ref, onBeforeUnmount, watch, defineProps, nextTick} from 'vue'
import {ElMessage, ElLoading} from 'element-plus'
import {Editor, Toolbar} from '@wangeditor/editor-for-vue'
import axios from 'axios'
import {v4 as uuidv4} from 'uuid'
import '@wangeditor/editor/dist/css/style.css'

/**
 * 添加/编辑会议对话框组件
 * 传入 modelValue 控制显示与否
 * conferenceId 用于编辑时传入会议ID
 * 不传 conferenceId 则为添加新会议
 * @type
 */
const props = defineProps({
  modelValue: Boolean,
  conferenceId: [String, Number] // 兼容字符串和数字
})
const emit = defineEmits(['update:modelValue'])

const visible = ref(false)
watch(() => props.modelValue, val => visible.value = val)
watch(visible, val => emit('update:modelValue', val))

const isEdit = ref(false)

const editorKey = ref(0)
const editor = ref(null)
const editorMounted = ref(false)
const formRef = ref()
const previewVisible = ref(false)
const previewUrl = ref('')
const uploadUuid = ref(uuidv4())
// 修改 watch visible 的逻辑
watch(visible, async (val) => {
  if (val) {
    // 对话框打开时
    isEdit.value = !!props.conferenceId
    resetForm()
    // 等待 DOM 更新完成后再初始化编辑器
    await nextTick()
    editorKey.value = Date.now() // 使用时间戳确保唯一性
    editorMounted.value = true

    if (isEdit.value) {
      // 延迟加载数据，确保编辑器完全初始化
      setTimeout(async () => {
        await loadConference(props.conferenceId)
      }, 100)
    }
  } else {
    // 对话框关闭时先标记为未挂载
    editorMounted.value = false

    // 延迟销毁编辑器，避免与组件更新冲突
    setTimeout(() => {
      if (editor.value) {
        try {
          editor.value.destroy()
        } catch (e) {
          console.warn('编辑器销毁时出现错误:', e)
        } finally {
          editor.value = null
        }
      }
    }, 50)
  }
})


const form = ref({
  title: '',
  cover: '',
  content: '',
  owner: '',
  publishTime: '',
  expireTime: ''
})
form.value.owner = localStorage.getItem('username') || ''

const rules = {
  title: [{required: true, message: '请输入名称', trigger: 'blur'}],
  content: [{required: true, message: '请输入内容', trigger: 'blur'}],
  owner: [{required: true, message: '请选择创建者', trigger: 'change'}],
  publishTime: [{required: true, message: '请选择开始时间', trigger: 'change'}],
  expireTime: [{required: true, message: '请选择结束', trigger: 'change'}]
}

// ---------------- 上传逻辑 ----------------
const coverList = ref([])
const coverFile = ref(null)

function handleCoverChange(file, fileList) {
  if (fileList.length > 0) {
    coverFile.value = fileList[0].raw
    coverList.value = [fileList[0]]
  }
}

function handleCoverRemove() {
  coverFile.value = null
  coverList.value = []
  form.value.cover = ''
}

function beforeCoverUpload(file) {
  const isImage = ['image/jpeg', 'image/png'].includes(file.type)
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isImage) ElMessage.error('只能上传 JPG/PNG 格式图片！')
  if (!isLt2M) ElMessage.error('图片大小不能超过 2MB！')
  return isImage && isLt2M
}

function handlePreview(file) {
  previewUrl.value = file.url || file.response?.url || ''
  previewVisible.value = true
}

// ---------------- 富文本逻辑 ----------------
const toolbarConfig = {}
const editorConfig = {
  placeholder: '请输入内容...',
  MENU_CONF: {
    uploadImage: {
      customUpload(file, insertFn) {
        const reader = new FileReader()
        reader.onload = e => insertFn(e.target.result)
        reader.readAsDataURL(file)
      }
    },
    uploadVideo: {
      customUpload(file, insertFn) {
        const reader = new FileReader()
        reader.onload = e => insertFn(e.target.result)
        reader.readAsDataURL(file)
      }
    }
  }
}

// 修改 handleCreated 函数
function handleCreated(editorInstance) {
  if (editorMounted.value) {
    editor.value = editorInstance
  }
}

// 修改 onBeforeUnmount
onBeforeUnmount(() => {
  editorMounted.value = false
  if (editor.value) {
    try {
      editor.value.destroy()
    } catch (e) {
      console.warn('组件销毁时编辑器销毁出错:', e)
    } finally {
      editor.value = null
    }
  }
})

function resetForm() {
  form.value = {
    title: '',
    cover: '',
    content: '', // 确保内容被清空
    owner: localStorage.getItem('username') || '',
    publishTime: '',
    expireTime: ''
  }
  coverFile.value = null
  coverList.value = []
  uploadUuid.value = uuidv4()
}

// ---------------- 加载会议 ----------------
/**
 * 加载会议详情
 * @param id
 * @returns {Promise<void>}
 */
async function loadConference(id) {
  const res = await axios.get('/conference/get-info', {params: {id}})
  const data = res.data.data
  form.value.title = data.name
  form.value.content = data.content
  form.value.owner = data.userName
  form.value.publishTime = data.startTime
  form.value.expireTime = data.endTime


  const res2 = await axios.get('/conference/get-cover', {params: {id}})
  const url = res2.data.data
  form.value.cover = url
  coverList.value = [{name: '封面图', url}]

}

// ---------------- 提交逻辑 ----------------
async function submitForm() {
  formRef.value.validate(async (valid) => {
    if (!valid) return

    let content = form.value.content
    const tempUrls = []
    const mediaTagReg = /<(img|video|source)[^>]*src=['"]([^'"]+)['"][^>]*>/gi
    content = content.replace(mediaTagReg, (match, tag, src) => {
      tempUrls.push({tag, src, match})
      return match
    })

    const loading = ElLoading.service({text: '上传媒体中...', background: 'rgba(0,0,0,0.3)'})
    try {
      for (const item of tempUrls) {
        const file = await getFileFromSrc(item.src)
        if (!file) continue
        const form = new FormData()
        form.append('file', file)
        form.append('uuid', uploadUuid.value)
        const res = await axios.post('/conference/upload-media', form)
        content = content.replace(item.src, res.data.data)
      }
    } finally {
      loading.close()
    }

    content = content.replace(/poster=['"]{0,1}['"]{0,1}/gi, '')

    const data = {
      id: props.conferenceId,
      name: form.value.title,
      content,
      startTime: form.value.publishTime,
      endTime: form.value.expireTime,
      uuid: uploadUuid.value
    }

    const formData = new FormData()
    formData.append('data', new Blob([JSON.stringify(data)], {type: 'application/json'}))
    if (coverFile.value) formData.append('cover', coverFile.value)

    const url = isEdit.value ? '/conference/update' : '/conference/add'
    await axios.post(url, formData, {headers: {'Content-Type': 'multipart/form-data'}})

    visible.value = false
  })
}

// ---------------- 工具方法 ----------------
async function getFileFromSrc(src) {
  if (src.startsWith('data:')) {
    const [head, base64] = src.split(',')
    const mime = head.match(/:(.*?);/)[1]
    const bin = atob(base64)
    const arr = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
    return new File([arr], 'media.' + mime.split('/')[1], {type: mime})
  }
  if (src.startsWith('blob:')) {
    const res = await fetch(src)
    const blob = await res.blob()
    return new File([blob], 'media.mp4', {type: blob.type})
  }
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src)
    const blob = await res.blob()
    // 尝试从 url 获取扩展名
    const ext = src.split('.').pop()?.split(/\#|\?/)[0] || 'media'
    return new File([blob], `media.${ext}`, {type: blob.type})
  }
  return null
}


</script>

<style scoped>
.upload-demo.hide-upload :deep(.el-upload--picture-card) {
  display: none;
}

.upload-demo :deep(.el-upload-list--picture-card .el-upload-list__item) {
  margin: 0;
  width: 148px;
  height: 148px;
}

.upload-demo :deep(.el-upload-list--picture-card) {
  display: inline-block;
  vertical-align: top;
}

:deep(video) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
}
</style>