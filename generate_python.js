const tidy_code = require('./tidy_code');

function generate_deserialization_code(params) {
    return params.map((param, index) => {
        const {name, type} = param;
        if (type === 'int32') {
            return `
        (${name},) = struct.unpack('=i', in_buff[:4])
        in_buff = in_buff[4:]
        `;
        } else if (type === 'float') {
            return `
        (${name},) = struct.unpack('=f', in_buff[:4])
        in_buff = in_buff[4:]
        `;
        } else if (type === 'string' || type === 'buffer') {
            return `
        (len_${index},) = struct.unpack('=i', in_buff[:4])
        in_buff = in_buff[4:]
        ${name} = in_buff[:len_${index}]
        in_buff = in_buff[len_${index}:]
        `;
        } else if (type === 'vector_string') {
            return `
        (vector_cnt_${index},) = struct.unpack('=i', in_buff[:4])
        in_buff = in_buff[4:]
        (vector_len_${index},) = struct.unpack('=i', in_buff[:4])
        in_buff = in_buff[4:]
        ${name} = []
        buffer_${index} = in_buff[:vector_len_${index}]
        in_buff = in_buff[vector_len_${index}:]
        for i in xrange(vector_cnt_${index}):
            (_v_len_${index},) = struct.unpack('=i', buffer_${index}[:4])
            buffer_${index} = buffer_${index}[4:]
            ${name}.append(buffer_${index}[:_v_len_${index}])
            buffer_${index} = buffer_${index}[_v_len_${index}:]
        `;
        } else if (type === 'vector_int32') {
            return `
        (vector_cnt_${index},) = struct.unpack('=i', in_buff[:4])
        in_buff = in_buff[4:]
        ${name} = []
        buffer_${index} = in_buff[:vector_cnt_${index}*4]
        in_buff = in_buff[vector_cnt_${index}*4:]
        for i in xrange(vector_cnt_${index}):
            (cnt_${index},) = struct.unpack('=i', buffer_${index}[:4])
            ${name}.append(cnt_${index})
            buffer_${index} = buffer_${index}[4:]
        `;
        } else if (type === 'vector_float') {
            return `
        (vector_cnt_${index},) = struct.unpack('=i', in_buff[:4])
        in_buff = in_buff[4:]
        ${name} = []
        buffer_${index} = in_buff[:vector_cnt_${index}*4]
        in_buff = in_buff[vector_cnt_${index}*4:]
        for i in xrange(vector_cnt_${index}):
            (cnt_${index},) = struct.unpack('=f', buffer_${index}[:4])
            ${name}.append(cnt_${index})
            buffer_${index} = buffer_${index}[4:]
        `;
        } else {
            throw new Error(`type '${type}' not supported.`);
        }
    }).join('');
}

function generate_params_str_list(req_params) {
    const req_params_str_list = req_params.map((param) => {
        const {name, type} = param;
        return name;
    });
    return req_params_str_list.join(', ');
}

function generate_return_rsp_params_code(rsp_params) {
    const def_code_list = rsp_params.map((param) => {
        const {name, type} = param;
        if (type === 'int32') {
            return `
    ${name} = 0`;
        } else if (type === 'float') {
            return `
    ${name} = 0.`;
        } else if (type === 'string') {
            return `
    ${name} = ''`;
        } else if (type === 'vector_string') {
            return `
    ${name} = []`;
        } else if (type === 'vector_int32') {
            return `
    ${name} = []`;
        } else if (type === 'vector_float') {
            return `
    ${name} = []`;
        } else {
            throw new Error(`type '${type}' not supported.`);
        }
    });
    const ret_code = generate_params_str_list(rsp_params);

    return `
${def_code_list.join('\n')}
    return [${ret_code}]
    `
}

function generate_def_codes(functions) {
    const def_str_list = functions.map((func, index) => {
        const {func_name, req_params, rsp_params} = func;
        return `
def ${func_name}(${generate_params_str_list(req_params)}):
    # TODO:
    ${generate_return_rsp_params_code(rsp_params)}
`;
    });

    return def_str_list.join('');
}

function generate_call_code(func_name, req_params, rsp_params)
{
    const req_param_str = req_params.map(param => param.name).join(', ');
    const rsp_param_str = `[${rsp_params.map(param => param.name).join(', ')}]`;
    return `${rsp_param_str} = ${func_name}(${req_param_str})`;
}

function adjust_code_indent(code, blanks_to_add=0) {

    if (blanks_to_add === 0) {
        return code;
    }
    else {
        const arr = code.split('\n');
        const ret = [];
        for (let i = 0, len = arr.length; i < len; ++ i) {
            if (!(0 === arr[i].trim().length)) {
                if (blanks_to_add > 0) {
                    ret.push(' '.repeat(blanks_to_add) + arr[i]);
                } else {
                    ret.push(arr[i].replace(' '.repeat(blanks_to_add), ''));
                }
            } else {
                ret.push('');
            }
        }
        return ret.join('\n');
    }
}

function generate_call_codes(functions)
{
    const call_str_list = functions.map((func, index) => {
        const {func_name, req_params, rsp_params} = func;

        const deserialization_code = adjust_code_indent(generate_deserialization_code(req_params), 4);
        const call_code = generate_call_code(func_name, req_params, rsp_params);
        const rsp_code = adjust_code_indent(generate_rsp_code(rsp_params), 4);

        const call_codes = `
        if func_index == ${index}:
            ${deserialization_code}
            
            error_code = 0
            try:
                ${call_code}
            except Exception, err:
                dbg_log('Error in Python: ' + err.message)
                error_code = -1
            
            rsp_buffer += struct.pack('=i', error_code)
            
            if error_code == 0:    
                ${rsp_code}
        `;


        if (index === 0) {
            return call_codes;
        }
        else {
            return call_codes.replace(/^(\s+)if/, '$1elif');
        }
    });

    return call_str_list.join('');
}

function generate_rsp_code(rsp_params)
{
    return rsp_params.map((param, index) => {
        const {name, type} = param;
        if (type === 'int32') {
            return `
            rsp_buffer += struct.pack('=i', ${name})
            `;
        } else if (type === 'float') {
            return `
            rsp_buffer += struct.pack('=f', ${name})
            `;
        } else if (type === 'string') {
            return `
            str_len_${index} = len(${name})
            rsp_buffer += struct.pack('=i', str_len_${index})
            rsp_buffer += ${name}
            `;
        } else if (type === 'vector_string') {
            return `
            v_cnt_${index} = len(${name})
            rsp_buffer += struct.pack('=i', v_cnt_${index})
            total_len_${index} = len(${name}) * 4
            for i in xrange(len(${name})):
                total_len_${index} += len(${name}[i])
            rsp_buffer += struct.pack('=i', total_len_${index})
            
            for i in xrange(len(${name})):
                tmp_len = len(${name}[i])
                rsp_buffer += struct.pack('=i', tmp_len)
                rsp_buffer += ${name}[i]
        `;
        } else if (type === 'vector_int32') {
            return `
            v_cnt_${index} = len(${name})
            rsp_buffer += struct.pack('=i', v_cnt_${index})
            for i in xrange(len(${name})):
                rsp_buffer += struct.pack('=i', ${name}[i])
        `;
        } else if (type === 'vector_float') {
            return `
            v_cnt_${index} = len(${name})
            rsp_buffer += struct.pack('=i', v_cnt_${index})
            for i in xrange(len(${name})):
                rsp_buffer += struct.pack('=f', ${name}[i])
        `;
        } else {
            throw new Error(`type '${type}' not supported.`);
        }
    }).join('\n');
}

function generate_initialization_args(init_params) {
    return generate_params_str_list(init_params, []);
}

function generate_python(class_name, init_params, functions, desc, version)
{
    const def_code = generate_def_codes(functions);
    const initialization_args = generate_initialization_args(init_params);
    const init_deserialization_code = generate_deserialization_code(init_params);
    const init_call_code = generate_call_code("initialize", init_params, []);
    const call_code = generate_call_codes(functions);
    const code = `#!/usr/bin/env python
# -*- coding: utf-8 -*-
# **********************************************************************
# This file was generated by a NodejsCallPython parser!
# NodejsCallPython version ${version} by liwang112358@gmail.com
# Generated from ${desc} at ${(new Date()).toString()}
# **********************************************************************

import os
import sys
import struct

def initialize(${initialization_args}):
    return []
${def_code}

def readed(length):
    ret_buffer = ''
    while len(ret_buffer) < length:
        buffer = fd0.read(length - len(ret_buffer))
        if len(buffer) == 0:
            sys.exit(-1)
        ret_buffer += buffer
    return ret_buffer

def written(buffer):
    fd1.write(buffer)
    fd1.flush()

def dbg_log(msg):
    _type = 1
    sid = 0
    buffer_len = len(msg)
    out_buff = ''
    out_buff += struct.pack('=i', _type)
    out_buff += struct.pack('=i', sid)
    out_buff += struct.pack('=i', buffer_len)
    out_buff += msg
    written(out_buff)

def ready():
    _type = 2
    sid = 0
    buffer_len = 1
    out_buff = ''
    out_buff += struct.pack('=i', _type)
    out_buff += struct.pack('=i', sid)
    out_buff += struct.pack('=i', buffer_len)
    out_buff += ' '
    written(out_buff)

if __name__ == '__main__':
    global fd0
    global fd1
    fd0 = os.fdopen(os.dup(sys.stdin.fileno()), "rb")
    fd1 = os.fdopen(os.dup(sys.stdout.fileno()), "wb")
    os.close(sys.stdin.fileno())
    os.close(sys.stdout.fileno())
    initialized = False
    while True:
        (buf_len,) = struct.unpack('=i', readed(4))
        in_buff = readed(buf_len)
        ${init_deserialization_code}
        ${init_call_code}
        ready()
        initialized = True
        break

    if not initialized:
        dbg_log("initialize failed.")
        sys.exit(-1)

    while True:
        (buf_len,) = struct.unpack('=i', readed(4))
        in_buff = readed(buf_len)
        (sid,) = struct.unpack('=i', in_buff[:4])
        in_buff = in_buff[4:]
        (func_index,) = struct.unpack('=i', in_buff[:4])
        in_buff = in_buff[4:]
        
        _type = 0
        rsp_header = struct.pack('=i', _type)
        rsp_header += struct.pack('=i', sid)
        
        rsp_buffer = struct.pack('=i', func_index)
        ${call_code}

        rsp_buffer_len = len(rsp_buffer)
        rsp_header += struct.pack('=i', rsp_buffer_len)
        written(rsp_header)
        written(rsp_buffer)
`;
    return tidy_code(code, true);
}

module.exports = generate_python;
