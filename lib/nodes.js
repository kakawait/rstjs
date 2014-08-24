define(function() {
    'use strict';

    var nodes = {};

    function Node(type, value, children) {
        this.type      = type;
        this.value     = value;
        this.children  = children || [];
    }
    Node.prototype.hasChildren = function() {
        return typeof this.children !== 'undefined' && this.children.length > 0;
    };

    function HeaderNode(value, level) {
        Node.call(this, 'header', value, []);
        this.level = level;
    }
    HeaderNode.prototype = Object.create(Node.prototype);
    HeaderNode.prototype.constructor = HeaderNode;


    /** INLINE **/

    function InlineNode(type, value) {
        this.type  = type;
        this.value = value;
    }

    function TargetInlineNode(value, reference) {
        InlineNode.call(this, 'target', value);
        this.reference = reference;
    }
    TargetInlineNode.prototype = Object.create(InlineNode.prototype);
    TargetInlineNode.prototype.constructor = TargetInlineNode;

    function ReferenceInlineNode(value) {
        InlineNode.call(this, 'reference', value);
    }
    ReferenceInlineNode.prototype = Object.create(InlineNode.prototype);
    ReferenceInlineNode.prototype.constructor = ReferenceInlineNode;

    return {
        Header: HeaderNode,

        Target: TargetInlineNode,
        Reference: ReferenceInlineNode
    };
});