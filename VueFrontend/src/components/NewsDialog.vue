<template>
  <el-dialog
      :model-value="visible"
      :title="isEdit ? '修改资讯' : '新增资讯'"
      width="60%"
      :before-close="handleBeforeClose"
      :destroy-on-close="true"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="新闻标题" prop="title">
        <el-input v-model="form.title" placeholder="请输入新闻标题" />
      </el-form-item>

      <el-form-item label="作者" prop="author">
        <el-input v-model="form.author" placeholder="请输入作者" />
      </el-form-item>

      <el-form-item label="简介" prop="summary">
        <el-input v-model="form.summary" type="textarea" placeholder="请输入新闻简介" />
      </el-form-item>

      <el-form-item label="图片" prop="imagePath">
        <div class="image-preview-wrapper">
          <el-image
              v-if="form.imagePath"
              :key="form.imagePath"
              :src="form.imagePath"
              class="preview-image"
              :preview-src-list="[form.imagePath]"
              fit="contain"
              preview-teleported
              @error="handleImageLoadError"
              @load="handleImageLoadSuccess"
          />

          <div v-else class="preview-image placeholder">暂无图片</div>
          <div v-if="form.imagePath" class="image-info">图片路径：{{ form.imagePath }}</div>
          <el-upload
              class="upload-button"
              action="http://localhost:8080/api/news/upload"
              :show-file-list="false"
              :on-success="handleUploadSuccess"
              :before-upload="handleBeforeUpload"
              accept="image/*"
          >
            <el-button type="primary" style="margin-top: 8px;">添加图片</el-button>
          </el-upload>
        </div>
      </el-form-item>

      <el-form-item label="排序">
        <el-tooltip
            :content="props.isAdmin
    ? '可选排序值，越小越靠前'
    : (!props.isEdit
        ? '默认排在最后，普通用户需审核通过后可修改'
        : (form.status === '已拒绝'
            ? '已拒绝的资讯不可修改排序'
            : '可选排序值，越小越靠前'))"
            placement="top"
        >

          <el-input-number
              v-model="form.sortOrder"
              :min="0"
              :max="isEdit ? maxSortOrder : initialSortOrder"
              :disabled="!allowSortInput"
              placeholder="默认排到最后"
          />
        </el-tooltip>

        <div class="sort-tip" v-if="isEdit">
          当前排序值: {{ form.sortOrder }} (范围: 0 - {{ maxSortOrder }})
        </div>
        <div class="sort-tip" v-else-if="props.isAdmin">
          可选择排序值，范围: 0 - {{ initialSortOrder }}
        </div>
        <div class="sort-tip" v-else>
          审核通过后资讯将默认排在最后，可在“查看审核状态”中修改
        </div>
      </el-form-item>


      <el-form-item label="内容" prop="content">
        <div style="border: 1px solid #ccc">
          <Toolbar :editor="editorRef" :defaultConfig="toolbarConfig" mode="default" style="border-bottom: 1px solid #ccc" />
          <Editor
              v-model="form.content"
              :defaultConfig="editorConfig"
              mode="default"
              style="height: 300px; overflow-y: auto"
              @onCreated="onEditorCreated"
              @onChange="handleEditorChange"
          />
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="submitForm">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormItemRule } from 'element-plus'
import '@wangeditor/editor/dist/css/style.css'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import type { IDomEditor, IToolbarConfig, IEditorConfig, IUploadConfig } from '@wangeditor/editor'

interface NewsItem {
  id?: number
  title: string
  imagePath: string
  sortOrder: number
  author: string
  summary: string
  content: string
  tenantId: number
  status?: string
}

const props = defineProps<{
  visible: boolean
  isEdit: boolean
  isAdmin: boolean
  modelValue: NewsItem
  maxSortOrder: number // 父组件传入的最大排序值
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'save', val: NewsItem): void
  (e: 'cancel'): void
}>()

const formRef = ref<FormInstance>()
const form = ref<NewsItem>({ ...props.modelValue, sortOrder: props.modelValue.sortOrder ?? 0 })
const allowSortInput = computed(() => {
  if (props.isAdmin) return true
  if (!props.isEdit) return false
  return form.value.status === '已通过'
})

const lastImagePath = ref('')
const hasSaved = ref(false)
const editorRef = ref<IDomEditor | null>(null)
const initialSortOrder = ref(props.modelValue.sortOrder ?? 0) // 保存初始排序值

const oldContentMedia = ref<string[]>([])
const addedMedia = ref<string[]>([])
const isImageReplaced = ref(false)
const retryCount = ref(0)

// 计算属性：是否允许修改排序值
const allowSortChange = computed(() => {
  // 新增时只能选择小于等于初始值的排序位置
  return props.isEdit ? true : form.value.sortOrder <= initialSortOrder.value
})

function handleImageLoadError() {
  if (retryCount.value < 3) {
    retryCount.value++
    setTimeout(() => {
      const tmp = form.value.imagePath
      form.value.imagePath = ''
      nextTick(() => form.value.imagePath = tmp)
    }, 500 + retryCount.value * 300)
  } else {
    ElMessage.warning('封面图片加载失败，请稍后重试')
  }
}

function handleImageLoadSuccess() {
  retryCount.value = 0
}

function extractMediaUrls(html: string): string[] {
  const urls: string[] = []
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/g
  const videoRegex = /<video[^>]*src=["']([^"']+)["'][^>]*>/g
  const sourceRegex = /<source[^>]*src=["']([^"']+)["'][^>]*>/g
  let match
  while ((match = imgRegex.exec(html))) urls.push(match[1])
  while ((match = videoRegex.exec(html))) urls.push(match[1])
  while ((match = sourceRegex.exec(html))) urls.push(match[1])
  return urls
}

function onEditorCreated(editor: IDomEditor) {
  editorRef.value = editor
  const html = editor.getHtml()
  oldContentMedia.value = extractMediaUrls(html)
}

function handleEditorChange(editor: IDomEditor) {
  const html = editor.getHtml()
  form.value.content = html
}

const toolbarConfig: Partial<IToolbarConfig> = {}

const editorConfig: Partial<IEditorConfig> = {
  placeholder: '请输入新闻内容...',
  MENU_CONF: {
    uploadImage: {
      customUpload(file: File, insertFn: (url: string) => void) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
        if (!allowedTypes.includes(file.type)) {
          ElMessage.error('仅支持 jpg/png/gif 格式图片')
          return
        }

        if (file.size > 5 * 1024 * 1024) {
          ElMessage.error('图片大小不能超过 5MB')
          return
        }

        const formData = new FormData()
        formData.append('file', file)

        fetch('http://localhost:8080/api/news/upload', {
          method: 'POST',
          body: formData
        })
            .then(res => res.json())
            .then(async result => {
              if (result.url) {
                const ok = await checkImageAccessible(result.url)
                if (ok) {
                  insertFn(result.url)
                  addedMedia.value.push(result.url)
                } else {
                  ElMessage.warning('图片已上传但暂时无法访问，请稍后手动刷新')
                }
              } else {
                ElMessage.error('图片上传失败')
              }
            })
            .catch(() => ElMessage.error('上传异常'))
      }
    },

    uploadVideo: {
      customUpload(file: File, insertFn: (url: string) => void) {
        const allowedTypes = ['video/mp4', 'video/webm']
        if (!allowedTypes.includes(file.type)) {
          ElMessage.error('仅支持 mp4/webm 格式视频')
          return
        }

        if (file.size > 20 * 1024 * 1024) {
          ElMessage.error('视频大小不能超过 20MB')
          return
        }

        const formData = new FormData()
        formData.append('file', file)

        fetch('http://localhost:8080/api/news/upload', {
          method: 'POST',
          body: formData
        })
            .then(res => res.json())
            .then(result => {
              if (result.url) {
                insertFn(result.url)
                addedMedia.value.push(result.url)
              } else {
                ElMessage.error('视频上传失败')
              }
            })
            .catch(() => ElMessage.error('上传异常'))
      }
    }
  }
}
function checkImageAccessible(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
  })
}


watch(() => props.visible, (visible) => {
  if (visible) {
    form.value = { ...props.modelValue, sortOrder: props.modelValue.sortOrder ?? 0 }
    initialSortOrder.value = props.modelValue.sortOrder ?? 0 // 保存初始排序值
    lastImagePath.value = props.modelValue.imagePath || ''
    isImageReplaced.value = false
    hasSaved.value = false
    const content = props.modelValue.content || ''
    oldContentMedia.value = extractMediaUrls(content)
    addedMedia.value = []

    if (!props.isEdit && editorRef.value) {
      editorRef.value.clear()
    }
  }
})

const rules = {
  title: [{ required: true, message: '请输入新闻标题', trigger: 'blur' }],
  author: [{ required: true, message: '请输入作者', trigger: 'blur' }],
  summary: [{ required: true, message: '请输入新闻简介', trigger: 'blur' }],
  imagePath: [{ required: true, message: '请上传图片', trigger: 'change' }],
  sortOrder: [
    {
      required: true,
      message: '请输入排序值',
      trigger: 'blur'
    },
    {
      validator: (rule: any, value: number, callback: any) => {
        if (!props.isEdit) {
          if (value < 0 || value > initialSortOrder.value) {
            callback(new Error(`新增资讯排序值只能在0到${initialSortOrder.value}之间`))
            return
          }
        }
        callback()
      },
      trigger: 'change'
    }
  ] as FormItemRule[],

  content: [
    {
      required: true,
      validator(_: unknown, value: string, callback: (error?: Error) => void) {
        const div = document.createElement('div')
        div.innerHTML = value || ''
        const plainText = div.innerText.trim()
        const hasMedia = div.querySelector('img, video') !== null
        if (!plainText && !hasMedia) {
          callback(new Error('请输入新闻内容'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    } as FormItemRule
  ]
}

function handleUploadSuccess(response: any) {
  if (response?.url) {
    // 删除旧图片（如果有）
    if (
        form.value.imagePath &&
        form.value.imagePath !== response.url &&
        form.value.imagePath !== lastImagePath.value
    ) {
      deleteMediaFile(form.value.imagePath)
    }

    form.value.imagePath = response.url
    isImageReplaced.value = true
    ElMessage.success('图片上传成功')
  } else {
    ElMessage.error('图片上传失败')
  }
}

function handleBeforeUpload(file: File) {
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) ElMessage.error('图片大小不能超过 5MB')
  return isLt5M
}

async function submitForm() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    const imageChanged = form.value.imagePath && form.value.imagePath !== lastImagePath.value
    hasSaved.value = true

    // 清理未使用的媒体文件
    await deleteUnusedMedia()

    // 删除旧封面（如果有变化）
    if (imageChanged && lastImagePath.value) {
      await deleteMediaFile(lastImagePath.value)
    }

    emit('save', form.value)
  } catch (err) {
    console.warn('表单验证失败:', err)
  }
}

// 删除单个媒体文件
async function deleteMediaFile(url: string) {
  try {
    await fetch(`http://localhost:8080/api/news/deleteMedia?url=${encodeURIComponent(url)}`, {
      method: 'DELETE'
    })
  } catch (err) {
    console.error('删除媒体文件失败:', url, err)
  }
}

// 清理未使用的媒体文件
async function deleteUnusedMedia() {
  // 清理封面图片
  if (!hasSaved.value && isImageReplaced.value && form.value.imagePath) {
    await deleteMediaFile(form.value.imagePath)
  }

  // 清理富文本编辑器中的媒体文件
  const currentMedia = extractMediaUrls(form.value.content || '')

  if (hasSaved.value) {
    // 已保存：清理旧媒体中不再使用的文件
    const allPastMedia = [...new Set([...oldContentMedia.value, ...addedMedia.value])]
    const unused = allPastMedia.filter(url => !currentMedia.includes(url))

    for (const url of unused) {
      await deleteMediaFile(url)
    }
  } else {
    // 未保存：清理本次新增的所有媒体文件
    for (const url of addedMedia.value) {
      await deleteMediaFile(url)
    }
  }
}

async function handleCancel() {
  await deleteUnusedMedia()
  emit('update:visible', false)
  emit('cancel')
}

function handleBeforeClose(done: () => void) {
  deleteUnusedMedia().finally(() => done())
}
</script>

<style scoped>
:deep(.w-e-text-container img),
:deep(.w-e-text-container video) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 8px auto;
}
.image-preview-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.preview-image {
  width: 200px;
  height: 150px;
  object-fit: contain;
  border: 1px solid #ccc;
  background-color: #f9f9f9;
  display: block;
  margin-bottom: 6px;
  cursor: pointer;
}
.preview-image.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aaa;
  font-size: 14px;
}
.image-info {
  font-size: 12px;
  color: #999;
  text-align: center;
  word-break: break-all;
  margin-bottom: 6px;
}
.upload-button {
  display: flex;
  justify-content: center;
}
.sort-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}
</style>