# swag README

一、安装

1、打开 vscode。扩展中搜索 swag。安装并点击重新加载。

2、项目中要包含 swag-config.json 。配置如下：

```json
{
  // 配置代码模板
  "templatePath": "./swagTemplate",
  "outDir": "../src/services",
  "originUrl": "http://your-service-hostname/v2/api-docs",
  // 配置代码风格
  "prettierConfig": {
    "printWidth": 120,
    "singleQuote": true,
    "trailingComma": "none",
    "jsxBracketSameLine": true
  }
}
```

代码模板：swagTemplate.ts

```typescript
import { Template } from "swag-engine";

module.exports = {
  // 类型代码
  header(inter) {
    return `
    export ${inter.paramsType.replace("lock: number", "lock?: number")}
    
    export type Response = ${inter.responseType}

    export const init: Response;

    export function request(params${inter.bodyParams ? "" : "?"}: Params${
      inter.bodyParams ? `, bodyParams: ${inter.bodyParams}` : ""
    }): Promise<Response>;

    export function createFetchAction<Key>(types: FetchTypes<Key>): (params${
      inter.bodyParams ? "" : "?"
    }: Params${
      inter.bodyParams ? `, bodyParams: ${inter.bodyParams}` : ""
    }, meta?)
      => { type: Key; payload?: Response; params?: Params; url: string; types: string[] } & Promise<Response>
      `;
  },

  // 公共代码
  commonHeader() {
    return `
    interface FetchTypes<key> {
			error: 'error',
			success: key,
			loading: 'loading',
		};

		interface FetchAction<BO, key> {
			type: key,
			payload: BO,
    }
    `;
  },

  // 实现代码
  implement(inter) {
    return `
    /**
     * @description ${inter.description}
     */
    
    import { getUrl } from 'src/utils/reduxUtils';
    import * as defs from '../definitions/index';

    export ${inter.paramsType}

    export const init = ${inter.initialValue};

    export function createFetchAction(types) {
      return (params = {}${
        inter.bodyParams ? `, bodyParams` : ""
      }, meta?: any) => {
        return {
          types,
          meta,
          method: "${inter.method}",
          url: getUrl("${inter.path}", params, "${inter.method}"),
          ${inter.bodyParams ? "params: bodyParams," : "params,"}
          init: ${inter.initialValue},
        };
      };
    }
    `;
  }
} as Template;
```

二、使用

1、swag

1）如图。状态栏中的图标。如果是白色 swag(same)，说明本地 swagger 文档与远程一致。

点击 swag 后，提示是否全量更新接口，点击确定可以全量更新接口。

2）当后端接口有更新，状态栏出现黄色 mod(n) 或者 基类(m)。这说明有 n 个模块或者 m 个基类与远程不同需要。可以点击查看详情并更新，基类更新会写基类影响的模块。目前没有这个 case 所以截不了图

3）点击同步按钮，主动同步远程数据。

4）vscode 打开后，swag 每隔 10 分钟同步一次远程数据。
