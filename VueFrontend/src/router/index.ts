import {createRouter, createWebHistory} from 'vue-router'
import HomeView from '../views/home_admin.vue'
import AuditList from "@/views/AuditList.vue";
import CourseList from "@/views/CourseList.vue";
import CourseDetail from "@/views/CourseDetail.vue";
import ChapterDetail from "@/views/ChapterDetail.vue";

import axios from "axios";

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        { path: '/audit', name: 'AuditList', component: AuditList },
        { path: '/courses', name: 'CourseList', component: CourseList },
        { path: '/course/:id', name: 'CourseDetail', component: CourseDetail },
        { path: '/course/:courseId/chapters', name: 'ChapterDetail', component:
            ChapterDetail },
        {
            path: '/',
            redirect: '/login'
        },
        {
            path: '/meeting/:role(user|creator)/:id',
            name: 'MeetingRole',
            component: () => import('../views/MeetingRoom.vue'),
            props: true
        },
        {
            path: '/login',
            name: 'login',
            component: () => import('../views/Login.vue'),
        },
        {
            path: '/register',
            name: 'register',
            component: () => import('../views/LoginRegister.vue'),
        },
        {
            path: '/profile',
            name: 'profile',
            component: () => import('@/views/profile.vue')
        },
        // 管理员主布局路由 - 包含标签页容器
        {
            path: '/admin',
            name: 'admin',
            component: () => import('../components/TabsContainer.vue'),
            redirect: '/admin/home',
            children: [
                {
                    path: 'home',
                    name: 'adminHome',
                    component: () => import('../views/home_admin.vue'),
                    meta: {
                        title: '首页',
                        keepAlive: true,
                        showInTabs: false // 首页不在动态标签页中显示，因为它是固定的
                    }
                }
            ]
        },
        // 用户主布局路由 - 包含标签页容器
        {
            path: '/user',
            name: 'user',
            component: () => import('../components/home_user.vue'),
            redirect: '/user/home',
            children: [
                {
                    path: 'home',
                    name: 'userHome',
                    component: () => import('../views/UserHome.vue'),
                    meta: {
                        title: '用户首页',
                        keepAlive: true,
                        showInTabs: false
                    }
                },
                {
                    path: 'conference',
                    name: 'userConference',
                    component: () => import('../views/userConference.vue'),
                    meta: {
                        title: '会议管理',
                        keepAlive: true,
                        showInTabs: true
                    }
                },
                {
                    path: 'course',
                    name: 'userCourse',
                    component: () => import('../views/UserCourseList.vue'),
                    meta: {
                        title: '课程管理',
                        keepAlive: true,
                        showInTabs: true
                    }
                },
                {
                    path: 'news',
                    name: 'userNews',
                    component: () => import('../views/NewList.vue'),
                    meta: {
                        title: '新闻管理',
                        keepAlive: true,
                        showInTabs: true
                    }
                },
            ]
        },
        // 兼容原有路由的重定向
        {
            path: '/home_admin',
            redirect: '/admin/home'
        },
        {
            path: '/home_user',
            redirect: '/user/home'
        },
        // 管理员功能模块路由 - 这些路由会在标签页中显示
        {
            path: '/system/detail/1',
            name: 'userController',
            component: () => import('../components/TabsContainer.vue'),
            meta: {
                title: '用户管理',
                tabView: true,
                activeTab: 'user-control'
            }
        },
        {
            path: '/system/detail/2',
            name: 'DepartmentManagement',
            component: () => import('../components/TabsContainer.vue'),
            meta: {
                title: '组织管理',
                tabView: true,
                activeTab: 'department-management'
            }
        },
        {
            path: '/system/detail/3',
            name: 'New',
            component: () => import('../components/TabsContainer.vue'),
            meta: {
                title: '新闻管理',
                tabView: true,
                activeTab: 'new'
            }
        },
        // 在 router/index.ts 中修改标签页路由
        {
            path: '/system/detail/4',
            name: 'Course',
            component: () => import('../components/TabsContainer.vue'),
            meta: {
                title: '课程管理',
                tabView: true,
                activeTab: 'course'
            }
        },
        {
            path: '/system/detail/5',
            name: 'Conference',
            component: () => import('../components/TabsContainer.vue'),
            meta: {
                title: '会议管理',
                tabView: true,
                activeTab: 'conference'
            }
        },
        {
            path: '/system/detail/6',
            name: 'Tenant',
            component: () => import('../components/TabsContainer.vue'),
            meta: {
                title: '租户管理',
                tabView: true,
                activeTab: 'tenant'
            }
        },
        {
            path: '/system/detail/7',
            name: 'CourseExamine',
            component: () => import('../components/TabsContainer.vue'),
            meta: {
                title: '租户管理',
                tabView: true,
                activeTab: 'tenant'
            }
        },
        // 保留原有的独立路由（如果需要在标签页外访问）
        {
            path: '/user_control',
            name: 'user_control_standalone',
            component: () => import('../views/user_control.vue'),
            meta: {
                title: '用户管理（独立页面）'
            }
        }
    ],
})

// 路由守卫 - 处理认证和标签页状态
router.beforeEach((to, from, next) => {
    // 检查是否需要认证
    const token = localStorage.getItem('token')
    const publicRoutes = ['/login', '/register']

    if (!publicRoutes.includes(to.path) && !token) {
        next('/login')
        return
    }

    // 如果已登录且访问登录页，重定向到首页
    if (token && to.path === '/login') {
        axios.get('/user/confirm')
            .then(res => {
                const role = res.data.data
                if(role === 'ADMIN'){
                    next('/admin/home')
                }
                else{
                    next('/user/home')
                }
            })
        // 这里可以根据用户角色决定重定向到管理员还是用户首页
        // 暂时默认重定向到用户首页
        return
    }

    next()
})

// 路由后置守卫 - 更新页面标题
router.afterEach((to) => {
    const title = to.meta?.title as string
    if (title) {
        document.title = `${title} - 测盟汇管理系统`
    } else {
        document.title = '测盟汇管理系统'
    }
})

export default router

