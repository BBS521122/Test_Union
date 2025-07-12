import { CourseCard } from '../components/CourseCard';
import { CourseInfo } from '../interface/CourseInfo';
import { CourseRequestUtils } from '../utils/CourseRequestUtils';
import { CoursePage } from './CoursePage';
import router from '@ohos.router';

@Entry
@Component
struct Index {
  @Provide('pageInfos') pageInfos: NavPathStack = new NavPathStack();

  aboutToAppear(): void {
    this.pageInfos.pushPath({name:"LoginPage" });
  }

  build() {
    Navigation(this.pageInfos) {
      // empty
    }
    .hideNavBar(true)
    .hideBackButton(true)
    .titleMode(NavigationTitleMode.Mini)
    .hideTitleBar(true)
  }
}