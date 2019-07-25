# nodejscallc

这是一个用于快速生成管道通讯序列化反序列化脚手架的工程
目前支持node调用c/c++ node调用python的模版代码生成

参数传递支持四种类型
1. int 32位整形
2. string 字符串
3. vector_int 整形数组
4. vector_string 字符串数组

接口定义文件为json格式
***
    {
        "class_name" : "Test", //在c或者python中要实现的接口名称
        "init_params" : [     //初始化参数列表
            {
                "name" : "init_param_int",
                "type" : "int32"
            },
            {
                "name" : "init_param_float",
                "type" : "float"
            },
            {
                "name" : "init_param_string",
                "type" : "string"
            },
            {
                "name" : "init_param_vector_string",
                "type" : "vector_string"
            },
            {
                "name" : "init_param_vector_int",
                "type" : "vector_int32"
            },
            {
                "name" : "init_param_vector_float",
                "type" : "vector_float"
            }
        ],
        "functions": [
            {
                "func_name" : "func1",
                "req_params" : [    //传入参数列表
                    {
                        "name" : "param_int",
                        "type" : "int32"
                    },
                    {
                        "name" : "param_float",
                        "type" : "float"
                    },
                    {
                        "name" : "param_string",
                        "type" : "string"
                    },
                    {
                        "name" : "param_vector_string",
                        "type" : "vector_string"
                    },
                    {
                        "name" : "param_vector_int",
                        "type" : "vector_int32"
                    },
                    {
                        "name" : "param_vector_float",
                        "type" : "vector_float"
                    }
                ],
                "rsp_params" : [    //返回参数列表
                    {
                        "name" : "rsp_param_string",
                        "type" : "string"
                    },
                    {
                        "name" : "rsp_param_int",
                        "type" : "int32"
                    },
                    {
                        "name" : "rsp_param_float",
                        "type" : "float",
                    },
                    {
                        "name" : "rsp_param_vector_string",
                        "type" : "vector_string"
                    },
                    {
                        "name" : "rsp_param_vector_int",
                        "type" : "vector_int32"
                    },
                    {
                        "name" : "rsp_param_vector_float",
                        "type" : "vector_float"
                    }
                ]
            }
        ]
    }
***

![image](https://github.com/freelw/nodejscallc/blob/master/gif/show.gif)
