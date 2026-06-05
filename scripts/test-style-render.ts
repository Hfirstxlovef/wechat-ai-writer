import { writeFileSync } from "fs";
import { renderWechatHtml } from "../lib/wechat-renderer";

const sampleMd = `# Java Servlet 内存马原理和应急响应查杀

## 一、前言

大家应该或多或少听说过"一句话木马"或者 webshell（小马、大马）吧？以前篇幅搞攻击，就把那些恶意代码塞进服务器的文件里，这就要操控服务器，就跟在自己电脑上操作似的。

但安全防护技术不断进步，传统基于文件的 webshell 容易被检测扫描，所以攻击者倾向于动态注入。

> 内存马说白了，就是把恶意代码直接注入应用程序运行中的内存里。如果想躲过文件检测，必须把代码改造成无文件形态。

## Java Servlet Servlet 内存马

### Servlet 知识

Servlet 内存马是通过动态注册 Servlet 来实现的一种内存攻击手段。在 Java Web 应用中，Servlet 作为处理客户端请求的核心组件之一，能够直接处理 HTTP 请求并返回响应。

### 首先创建一个 JavaEE 项目

打开 IDE，选择 New Project → Jakarta EE → 选择 Tomcat 服务器 + JDK，生成基础脚手架。

### Servlet 装载流程

\`\`\`java
package com.example.menshell;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class MyServlet extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws java.io.IOException {
        response.getWriter().println("Hello World");
    }
}
\`\`\`

---

## 二、典型攻击链

1. 通过漏洞获取 RCE 入口
2. 动态注册恶意 Servlet
3. 通过 URL 后门访问

> 这种方式不留任何文件痕迹，常规的 webshell 扫描工具会失效。

## 三、应急响应思路

### 静态扫描

对所有部署的 Class 做字节码分析，识别可疑的 doGet/doPost 重写。

### 动态比对

- 启动时快照所有 Servlet
- 运行时定期对比当前注册表
- 发现新增可疑实例立即告警

`;

// 三种风格各跑一次，输出到独立文件
const variants: Array<[string, any]> = [
  [
    "tutorial",
    {
      theme: {
        primary: "#2563EB",
        secondary: "#1E40AF",
        background: "#FFFFFF",
        text: "#1F1F1F",
        secondaryText: "#555555",
        quoteBg: "#EFF6FF",
        codeBg: "#F1F5F9",
        codeText: "#1E40AF",
        accentDecorative: "#3B82F6",
      },
      components: {
        h1: "title-classic",
        h2: "section-banner",
        h3: "h3-number-badge",
        blockquote: "quote-card-tinted",
        divider: "hr-dashed-dots",
        img: "img-framed",
        articleWrapper: "bordered",
      },
      overrides: [
        {
          anchor: "first",
          type: "opening-card",
          props: { lead: "点击蓝字 关注我们", tagline: "技术 · 安全 · 实战" },
        },
        {
          anchor: { headingMatch: "Servlet 装载" },
          type: "callout-box",
          props: { label: "重点", body: "Servlet 内存马的核心是动态注册——不落地文件。" },
        },
        {
          anchor: { headingMatch: "典型攻击" },
          type: "callout-box",
          props: { label: "提示", body: "完整链路：漏洞 → 动态注册 → URL 后门。" },
        },
        {
          anchor: "last",
          type: "ending-card",
          props: { title: "感谢阅读", body: "若觉得有用，欢迎转发给同事。", signoff: "—— END ——" },
        },
      ],
      hero: { url: null, prompt: "" },
      meta: { modelUsed: "test-sample" },
    },
  ],
  [
    "literary",
    {
      theme: {
        primary: "#92400E",
        secondary: "#78350F",
        background: "#FFFFFF",
        text: "#1F1F1F",
        secondaryText: "#666666",
        quoteBg: "#FEF3C7",
        codeBg: "#FEF9E7",
        codeText: "#9A3412",
        accentDecorative: "#D97706",
      },
      components: {
        h1: "title-ornamental",
        h2: "section-decorated",
        h3: "title-classic",
        blockquote: "quote-card-stamp",
        divider: "hr-ornamental",
        img: "img-spotlight",
        articleWrapper: "plain",
      },
      overrides: [],
    },
  ],
  [
    "default",
    {},
  ],
];

for (const [name, styleJson] of variants) {
  const html = renderWechatHtml(sampleMd, { styleJson });
  const full = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name}</title><style>body{margin:0;padding:24px;background:#f3f3f3;font-family:-apple-system,sans-serif;}main{max-width:720px;margin:0 auto;background:#fff;padding:0;}</style></head><body><main>${html}</main></body></html>`;
  const outPath = `/tmp/wechat-style-${name}.html`;
  writeFileSync(outPath, full);
  console.log(`${name} → ${outPath}`);
}
