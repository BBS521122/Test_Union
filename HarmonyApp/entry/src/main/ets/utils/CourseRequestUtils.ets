import { http } from '@kit.NetworkKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { common } from '@kit.AbilityKit';
import { CourseData, CourseInfo, VideoProgress } from '../interface/CourseInfo';
import dataPreferences from '@ohos.data.preferences';
import preferences from '@ohos.data.preferences';


interface CourseGetApiResponse {
  code: number;
  data: CourseInfo[];
  message: string;
}

interface CourseGetInfoApiResponse {
  code: number;
  message?: string;
  data: CourseData;
}

interface CourseUpdateProgressApiResponse {
  code: number;
  message?: string;
}

interface GeneratedTypeLiteralInterface_1 {
  certPath: string;
  keyPath: string;
  certType: http.CertType;
  keyPassword: string;
}

interface HttpRequestOptions {
  method: http.RequestMethod;
  header: Record<string, string>;
  connectTimeout?: number;
  readTimeout?: number;
  extraData?: string;
  usingProtocol?: http.HttpProtocol;
  expectDataType?: http.HttpDataType;
  usingCache?: boolean;
  priority?: number;
  caPath?: string;
  clientCert?: GeneratedTypeLiteralInterface_1;
}

interface LoginData {
  id: number;
  name: string;
  token: string;
  role: string;
  state: string;
}

interface LoginApiResponse {
  code: number;
  data?: LoginData;
  message: string;
}


export class CourseRequestUtils {
  private static _baseUrl: string | null = null;

  // 提供静态方法初始化（需在Ability启动时调用）
  public static init(baseUrl: string) {
    // 支持HTTP协议，不强制转换为HTTPS
    if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
      CourseRequestUtils._baseUrl = baseUrl;
    } else {
      // 如果没有协议前缀，默认使用 HTTP
      CourseRequestUtils._baseUrl = `http://${baseUrl}`;
    }
    console.info('初始化baseUrl: ' + CourseRequestUtils._baseUrl);
  }

  public static get BASE_URL(): string {
    if (!CourseRequestUtils._baseUrl) {
      throw new Error('请先调用 CourseRequestUtils.init() 初始化 baseUrl');
    }
    console.info("这是baseUrl" + CourseRequestUtils._baseUrl)
    return CourseRequestUtils._baseUrl;
  }

  // 获取课程列表
  public static async getCourseList(query: string): Promise<CourseInfo[]> {
    const url = `${CourseRequestUtils.BASE_URL}/course/mobile/get-courses?query=${query}`;
    let httpRequest = http.createHttp();

    // 配置HTTP请求选项
    const requestOptions: HttpRequestOptions = {
      method: http.RequestMethod.GET,
      header: {
        'Content-Type': 'application/json'
      },
      connectTimeout: 60000,
      readTimeout: 60000,
      usingProtocol: http.HttpProtocol.HTTP1_1, // 使用HTTP/1.1协议
      expectDataType: http.HttpDataType.STRING,
      usingCache: false
    };

    return new Promise<CourseInfo[]>((resolve, reject) => {
      httpRequest.request(
        url,
        requestOptions,
        (err: BusinessError, data: http.HttpResponse) => {
          // 无论成功失败，先销毁请求
          httpRequest.destroy();
          if (err) {
            // 网络请求错误（如超时、无网络）
            reject(new Error(`网络请求失败: ${err.code} - ${err.message}`));
            return;
          }
          try {
            const res = JSON.parse(data.result as string) as CourseGetApiResponse;
            if (res.code == 200) {
              // 业务成功
              resolve(res.data);
            } else {
              // 业务错误（如服务器返回非200状态）
              reject(new Error(`业务错误: ${res.code} - ${res.message || '未知错误'}`));
            }
          } catch (parseErr) {
            // JSON解析错误
            reject(new Error('响应数据解析失败'));
          }
        }
      );
    });
  }

  // 获取课程数据
  public static async getCourseData(id: string): Promise<CourseData> {
    const url = `${CourseRequestUtils.BASE_URL}/course/mobile/get-info?id=${id}`;
    let httpRequest = http.createHttp();

    const requestOptions: HttpRequestOptions = {
      method: http.RequestMethod.GET,
      header: {
        'Content-Type': 'application/json'
      },
      connectTimeout: 60000,
      readTimeout: 60000,
      usingProtocol: http.HttpProtocol.HTTP1_1,
      expectDataType: http.HttpDataType.STRING,
      usingCache: false
    };

    return new Promise<CourseData>((resolve, reject) => {
      httpRequest.request(
        url,
        requestOptions,
        (err: BusinessError, data: http.HttpResponse) => {
          httpRequest.destroy(); // 销毁请求

          if (err) {
            reject(new Error(`网络请求失败: ${err.code} - ${err.message}`));
            return;
          }

          try {
            console.info("这是data" + data.result)
            console.info("这是url", url)
            const res = JSON.parse(data.result as string) as CourseGetInfoApiResponse;

            if (res.code === 200) {
              resolve(res.data);
            } else {
              reject(new Error(`业务错误: ${res.code} - ${res.message || '未知错误'}`));
            }
          } catch (parseErr) {
            reject(new Error('响应数据解析失败'));
          }
        }
      );
    });
  }

  // 更新视频播放进度
  public static async updateVideoProgress(courseId: string, progress: VideoProgress): Promise<void> {
    const url = `${CourseRequestUtils.BASE_URL}/course/${courseId}/progress`;
    let httpRequest = http.createHttp();

    const requestOptions: HttpRequestOptions = {
      method: http.RequestMethod.POST,
      header: {
        'Content-Type': 'application/json'
      },
      extraData: JSON.stringify(progress),
      connectTimeout: 60000,
      readTimeout: 60000,
      usingProtocol: http.HttpProtocol.HTTP1_1,
      expectDataType: http.HttpDataType.STRING,
      usingCache: false
    };

    return new Promise<void>((resolve, reject) => {
      httpRequest.request(
        url,
        requestOptions,
        (err: BusinessError, data: http.HttpResponse) => {
          httpRequest.destroy();

          if (err) {
            reject(new Error(`网络请求失败: ${err.code} - ${err.message}`));
            return;
          }

          try {
            const res = JSON.parse(data.result as string) as CourseUpdateProgressApiResponse;

            if (res.code === 200) {
              resolve();
            } else {
              reject(new Error(`业务错误: ${res.code} - ${res.message || '未知错误'}`));
            }
          } catch (parseErr) {
            reject(new Error('响应数据解析失败'));
          }
        }
      );
    });
  }

  public static async login(name: string, password: string): Promise<void> {
    const url = `${CourseRequestUtils.BASE_URL}/user/login`;
    let httpRequest = http.createHttp();
    console.log("进入login")

    const requestOptions: HttpRequestOptions = {
      method: http.RequestMethod.POST,
      header: {
        'Content-Type': 'application/json'
      },
      extraData: JSON.stringify({ name, password }),
      connectTimeout: 60000,
      readTimeout: 60000,
      usingProtocol: http.HttpProtocol.HTTP1_1, // 使用HTTP/1.1协议
      expectDataType: http.HttpDataType.STRING,
      usingCache: false,
      priority: 1
      // 移除了SSL相关的配置项（caPath和clientCert），因为HTTP不需要
    };
    console.log("创建RequeastOptions")

    return new Promise<void>((resolve, reject) => {
      httpRequest.request(url, requestOptions, async (err: BusinessError, data: http.HttpResponse) => {
        console.log("进入http")
        httpRequest.destroy();

        if (err) {
          console.error(`网络请求失败: ${err.code} - ${err.message}`)
          reject(new Error(`网络请求失败: ${err.code} - ${err.message}`));
          return;
        }
        console.log(data.result.toLocaleString())
        try {
          const res = JSON.parse(data.result as string) as LoginApiResponse;
          console.log(res.code.toString())
          if (res.code === 200 && res.data?.token) {
            try {
              // Get the context for preferences
              const context = getContext() as common.UIAbilityContext;
              // Get preferences with context and name
              const pref = await dataPreferences.getPreferences(context, 'tokenPreferences');
              // Store the token
              await pref.put('token', res.data.token);
              await pref.put('name', name);
              await pref.put('password', password);
              await pref.flush();
              resolve();
            } catch (prefErr) {
              reject(new Error(`Token存储失败: ${prefErr.message}`));
            }
          } else {
            reject(new Error(res.message || '登录失败'));
          }
        } catch (parseErr) {
          reject(new Error('响应数据解析失败'));
        }
      });
    });
  }
}