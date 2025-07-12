###需要安装的包
```
npm install express ws cors
npm install mediasoup mediasoup-client
```
index.js
```
{
      path: '/meeting/:role(user|creator)/:id',
      name: 'MeetingRole',
      component: () => import('../views/MeetingRoom.vue'),
      props: true
    },
```