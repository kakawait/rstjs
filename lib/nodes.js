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

    function ParagraphNode(children) {
        Node.call(this, 'paragraph', null, children);
    }
    ParagraphNode.prototype = Object.create(Node.prototype);
    ParagraphNode.prototype.constructor = ParagraphNode;

    /** INLINE **/

    function InlineNode(type, value) {
        this.type  = type;
        this.value = value;
    }
    InlineNode.prototype.getValue = function () {
        return this.value;
    };

    function TextInlineNode(value) {
        InlineNode.call(this, 'text', value);
    }
    TextInlineNode.prototype = Object.create(InlineNode.prototype);
    TextInlineNode.prototype.constructor = TextInlineNode;

    function EmphasisInlineNode(value) {
        InlineNode.call(this, 'emphasis', value);
    }
    EmphasisInlineNode.prototype = Object.create(InlineNode.prototype);
    EmphasisInlineNode.prototype.constructor = EmphasisInlineNode;

    function StrongEmphasisInlineNode(value) {
        InlineNode.call(this, 'strong', value);
    }
    StrongEmphasisInlineNode.prototype = Object.create(InlineNode.prototype);
    StrongEmphasisInlineNode.prototype.constructor = StrongEmphasisInlineNode;

    function LiteralInlineNode(value) {
        InlineNode.call(this, 'literal', value);
    }
    LiteralInlineNode.prototype = Object.create(InlineNode.prototype);
    LiteralInlineNode.prototype.constructor = LiteralInlineNode;

    function TargetInlineNode(value, reference) {
        InlineNode.call(this, 'target', value);
        this.reference = reference;
        this.referenced = null;
        this.indirectReferenceName = null;
    }
    TargetInlineNode.prototype = Object.create(InlineNode.prototype);
    TargetInlineNode.prototype.constructor = TargetInlineNode;

    function ReferenceInlineNode(value) {
        InlineNode.call(this, 'reference', value);
    }
    ReferenceInlineNode.prototype = Object.create(InlineNode.prototype);
    ReferenceInlineNode.prototype.constructor = ReferenceInlineNode;

    return {
        Paragraph: ParagraphNode,
        Header: HeaderNode,

        Text: TextInlineNode,
        Emphasis: EmphasisInlineNode,
        Strong: StrongEmphasisInlineNode,
        Literal: LiteralInlineNode,
        Target: TargetInlineNode,
        Reference: ReferenceInlineNode
    };
});