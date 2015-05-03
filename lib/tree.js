define(function() {
    'use strict';

    function Tree() {
        this.root    = {title: null, children: []};
        this.current = this.root.children;
    }
    Tree.prototype.add = function(node) {
        if (this.current instanceof Array && typeof node === 'object') {
            if (typeof node.children === 'undefined') {
                node.children = {};
            }
            this.current.push(node);
        }
    };
    Tree.prototype.addAll = function(nodes) {
        for (var i = nodes.length - 1; i >= 0; i--) {
            this.add(nodes[i]);
        }
    };
    Tree.prototype.current = function() {
        return this.current;
    };
    Tree.prototype.toString = function() {
        return this.root;
    };

    return Tree;
});