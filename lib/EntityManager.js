'use strict'
var { AttributeConstants } = require('./Constants.js')
var Utils = require('./Utils.js')

const SENTINEL = AttributeConstants.ENTITY_SENTINEL // 'ent'
const PREFIX = SENTINEL + '_'

class Entity {
    constructor(type, info) {
        this.type = type
        this.info = info
    }
    
    // get attrs
    toAttributes() {
        var attrs = {}
        attrs[SENTINEL] = this.type
        for (var attr in this.info) {
            attrs[PREFIX + attr] = this.info[attr]
        }
        return attrs
    }
    static fromAttributes(attributes) {
        var type = attributes[SENTINEL]
        var info = {}
        for (var attr in attributes) {
            if (attr.indexOf(PREFIX) === 0) {
                info[attr.substr(PREFIX.length)] = attributes[attr]
            }
        }
        return new Entity(type, info)
    }
}

class EntityManager {
    constructor() {
        this.entities = {}

        // regist entities
        this.registImage()
        this.registLink()
        this.registTable()
    }

    //生成图片Dom
    registImage() {
        var attrs = ['src', 'alt', 'title', 'id','width', 'height', 'style', 'class']
        this.register('img', {
            render: (info, entityHandler) => {
                Utils.assert(info.src, "image entity should have 'src'!")
                var html = '<img '
                for (var i = 0; i < attrs.length; i++) {
                    var attr = attrs[i]
                    if (attr in info) {
                        html += ` ${attr}="${info[attr]}"`
                    }
                }
                html += '>'
                return html
            },
            fromElement: (element) => {
                var info = {}
                for (var i = 0; i < attrs.length; i++) {
                    var attr = attrs[i]
                    if (element.hasAttribute(attr)) {
                        info[attr] = element.getAttribute(attr)
                    }
                }
                return info
            }
        })
    }

    //生成链接Dom
    registLink() {
        var attrs = ['href', 'alt', 'title', 'style', 'class', 'id', 'target']
        this.register('a', {
            render: (info, entityHandler) => {
                Utils.assert(info.href, "a entity should have 'href'!")
                var html = '<a '
                for (var i = 0; i < attrs.length; i++) {
                    var attr = attrs[i]
                    if (attr in info) {
                        html += ` ${attr}="${info[attr]}"`
                    }
                }
                if(info.title){
                    html += '>'+info.title+'</a>'
                }else{
                    html += '>插入链接</a>' 
                }

                return html
            },
            fromElement: (element) => {
                var info = {}
                for (var i = 0; i < attrs.length; i++) {
                    var attr = attrs[i]
                    if (element.hasAttribute(attr)) {
                        info[attr] = element.getAttribute(attr)
                    }
                }
                return info
            }
        })
    }

    //生成表格Dom
    registTable() {
        var attrs = ['title', 'rows', 'columns', 'style', 'class', 'id']
        this.register('table', {
            render: (info, entityHandler) => {
                Utils.assert(info.rows, "a entity should have 'rows'!")
                var html = '<table '
                for (var i = 0; i < attrs.length; i++) {
                    var attr = attrs[i]
                    if (attr in info) {
                        html += ` ${attr}="${info[attr]}"`
                    }
                }
                html += '><thead><tr><th colspan='+info.rows+'>表格占位和编辑问题</th></tr></thead>'
                if(info.rows){
                    for(var r = 0;r<info.rows;r++){
                        html +='<tr>'
                        if(info.columns){
                            for(var c = 0; c<info.columns; c++){
                                html += '<td></td>'
                            }
                        }  
                        html +='</tr>'
                    }
                }
                html += '</table>'
                return html
            },
            fromElement: (element) => {
                var info = {}
                for (var i = 0; i < attrs.length; i++) {
                    var attr = attrs[i]
                    if (element.hasAttribute(attr)) {
                        info[attr] = element.getAttribute(attr)
                    }
                }
                return info
            }
        })
    }
    register(type, options) {
        Utils.assert(options.render, "Entity options should include a 'render' function!")
        Utils.assert(options.fromElement, "Entity options should include a 'fromElement' function!")
        this.entities[type] = options
    }
    renderToElement(entity, entityHandle) {
        return this.tryRenderToElement_(entity, 'render', entityHandle)
    }
    exportToElement(entity) {
        // Turns out 'export' is a reserved keyword, so 'getHtml' is preferable.
        var elt = this.tryRenderToElement_(entity, 'export') ||
            this.tryRenderToElement_(entity, 'getHtml') ||
            this.tryRenderToElement_(entity, 'render')
        elt.setAttribute('data-entity', entity.type)
        return elt
    }

    /* Updates a DOM element to reflect the given entity.
       If the entity doesn't support the update method, it is fully
       re-rendered.
    */
    updateElement(entity, element) {
        var type = entity.type
        var info = entity.info
        if (this.entities[type] && typeof(this.entities[type].update) !== 'undefined') {
            this.entities[type].update(info, element)
        }
    }
    fromElement(element) {
        var type = element.getAttribute('data-entity')

        // HACK.  This should be configurable through entity registration.
        if (!type) {
            type = element.nodeName.toLowerCase()
        }

        if (type && this.entities[type]) {
            var info = this.entities[type].fromElement(element)
            return new Entity(type, info)
        }
    }
    tryRenderToElement_(entity, renderFn, entityHandle) {
        var type = entity.type
        var info = entity.info
        if (this.entities[type] && this.entities[type][renderFn]) {
            var res = this.entities[type][renderFn](info, entityHandle, document)
            if (res) {
                if (typeof res === 'string') {
                    var div = document.createElement('div')
                    div.innerHTML = res
                    return div.childNodes[0]
                } else if (typeof res === 'object') {
                    Utils.assert(typeof res.nodeType !== 'undefined', 'Error rendering ' + type + ' entity.  render() function' +
                        ' must return an html string or a DOM element.')
                    return res
                }
            }
        }
    }
    entitySupportsUpdate(entityType) {
        return this.entities[entityType] && this.entities[entityType]['update']
    }
}

module.exports = {
    Entity,
    EntityManager
}