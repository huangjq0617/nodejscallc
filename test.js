const Test = require('./build/releasejscallc/Test_proxy');
const test = new Test(
    {
        init_param_int: 567,
        init_param_float: 89.10,
        init_param_string: "dskdisjj",
        init_param_vector_string: ["v_init_string0", "v_init_string1", ''],
        init_param_vector_int: [654, 321],
        init_param_vector_float: [234.3, 934.6]
    },
    {
        test_env_var: 'ok',
    },
);
console.log('start');
test.ready(() => {
    console.log('ready');
    test.func1({
        param_int: 123,
        param_string: "mdmsbnnd",
        param_vector_float: [789.12, 482.67]
    }, (rsp) => {
        console.log('func1 rsp :', rsp, '\n\n');
    });

    test.func2({
        param_float: 456.78,
        param_vector_string: ['abc', '你好', 'xxxxxxx', '123', ''],
        param_vector_int: [123, 456],
    }, (rsp) => {
        console.log('func2 rsp :', rsp, '\n\n');
    });
});
