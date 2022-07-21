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
    disk: {
        NotFound: {
            code: 400101020,
            message: '找不到文件'
        },
        BvIllegal: {
            code: 400101101,
            message: 'bv不合法'
        }
    }
}