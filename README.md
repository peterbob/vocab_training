# vocab_training

一个纯 HTML + CSS + JavaScript 实现的日语单词读音测验小工具。

## 功能

- 批量输入词表
- 日语格式：`汉字,平假名读音`
- 英语格式：`中文提示,英文单词`
- 支持日语 / 英语切换
- 看字输入读音
- 听力听写
- 听懂判断
- 答错词进入下一轮继续测验
- 复习当前未通过单词
- 近期错误收藏夹
- 本地词汇库，按错误次数排序

## 运行方式

### 在线使用

开启 GitHub Pages 后，可以直接访问：

```text
https://peterbob.github.io/vocab_training/
```

GitHub Pages 设置方式：

1. 打开仓库 `Settings`
2. 进入 `Pages`
3. `Build and deployment` 选择 `Deploy from a branch`
4. Branch 选择 `main`，目录选择 `/root`
5. 保存后等待 GitHub 生成访问链接

### 本地使用

直接用浏览器打开：

```text
index.html
```

不需要后端，不需要安装依赖。

## 数据隐私

错题记录、近期错误收藏夹和词汇库都保存在用户自己的浏览器 `localStorage` 里。

- 不会上传到 GitHub
- 不会进入仓库代码
- 不同用户在自己的设备和浏览器里看到的是各自的数据
- 如果多人共用同一台电脑、同一个浏览器，才会共用这台浏览器里的本地记录

## 文件结构

```text
vocab_training/
├── README.md
├── index.html
├── script.js
└── style.css
```
