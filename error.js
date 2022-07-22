import config from "./config.js"

export default {
    server: {
        code: 500101000,
        message: 'internal server error'
    },
    auth: {
        Unauthorized: {
            code: 401101000,
            message: '您没有权限使用该功能'
        }
    },
    push: {
        Failed: {
            code: 500101001,
            message: ''
        }
    },
    disk: {
        NotFound: {
            code: 400101100,
            message: '找不到文件'
        },
        BvIllegal: {
            code: 400101101,
            message: 'bv不合法'
        },
        DownloadFailed: {
            code: 500101100,
            message: '下载失败'
        }
    },
    segment: {
        Failed: {
            code: 500101131,
            message: 'FFMPEG生成视频片段失败'
        },
        IntervalTooLong: {
            code: 400101130,
            message: `切片时长不应超过${config.segment.maxInterval}分钟`
        },
        ResourceNotFound: {
            code: 400101131,
            message: '素材视频不存在'
        }
    }
}