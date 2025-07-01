import { http } from '@kit.NetworkKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { common } from '@kit.AbilityKit';
import { CourseData, CourseInfo, VideoProgress } from '../interface/CourseInfo';

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

export class CourseRequestUtils {
  private static _baseUrl: string | null = null;

  // 提供静态方法初始化（需在Ability启动时调用）
  public static init(baseUrl: string) {
    CourseRequestUtils._baseUrl = baseUrl;
  }

  public static get BASE_URL(): string {
    if (!CourseRequestUtils._baseUrl) {
      throw new Error('请先调用 CourseRequestUtils.init() 初始化 baseUrl');
    }
    console.info("这是baseUrl"+CourseRequestUtils._baseUrl)
    return CourseRequestUtils._baseUrl;
  }

  // 获取课程列表
  public static async getCourseList(query: string): Promise<CourseInfo[]> {
    const url = `${CourseRequestUtils.BASE_URL}/course/mobile/get-courses?query=${query}`;
    let httpRequest = http.createHttp();
    return new Promise<CourseInfo[]>((resolve, reject) => {
      httpRequest.request(
        url, { method: http.RequestMethod.GET },
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

    return new Promise<CourseData>((resolve, reject) => {
      httpRequest.request(
        url,
        {
          method: http.RequestMethod.GET,
          header: {
            'Content-Type': 'application/json'
          }
        },
        (err: BusinessError, data: http.HttpResponse) => {
          httpRequest.destroy(); // 销毁请求

          if (err) {
            reject(new Error(`网络请求失败: ${err.code} - ${err.message}`));
            return;
          }

          try {
            console.info("这是data"+data.result)
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

    return new Promise<void>((resolve, reject) => {
      httpRequest.request(
        url,
        {
          method: http.RequestMethod.POST,
          header: {
            'Content-Type': 'application/json'
          },
          extraData: JSON.stringify(progress)
        },
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



}