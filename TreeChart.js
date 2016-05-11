/**
 * Created by Jason on 5/10/2016.
 */

var TreeChart = function() {
    // default attributes
    var height = 800;
    var width = 1200;
    var margin = {left: 100, right: 20, top: 20, bottom: 20};
    var expandedColor = 'red';
    var closedColor = 'green';
    var selectableStrokeColor = 'blue';
    var selectableStrokeWidth = 1.5;
    var textColor = '#000';
    var animDuration = 500;
    var radius = 4.5;
    var pathLength = 180;
    var pathWidth = 1.5;
    var pathColor = '#ccc';
    var fontSize = 11;
    var orientation = 'horizontal';
    var positions = {pos_1: 'y', pos_2: 'x', pos0_1: 'y0', pos0_2: 'x0', rotation: 0};

    // default to just sort by first value encountered
    // dunno what sort of data is coming in, make no assumptions
    var sort = function(a, b) {
        return a;
    };
    
    var chart = function(selection) {
        selection.each(function(root) {
            var i = 0;

            root.x0 = (height - margin.top - margin.bottom) / 2;
            root.y0 = 0;

            var g = d3.select(this).select('.outer-svg').select('.inner-svg');
            if (g.empty()) {
                 g = d3.select(this)
                    .append('svg')
                    .attr({'width': width, 'height': height})
                    .attr('class', 'outer-svg')
                    .append('g')
                    .attr('class', 'inner-svg')
                    .attr({'width': width - margin.left - margin.bottom, 'height': height - margin.top - margin.bottom})
                    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
            }


            // d3 tree object
            var tree = d3.layout.tree()
                .size([height - margin.top - margin.bottom, width - margin.left - margin.right]);

            // diagonal projection for the connecting paths
            var diagonal = d3.svg.diagonal()
                .projection(function(d) {return [d[positions.pos_1], d[positions.pos_2]];});

            // quickly toggle all children of node
            function toggleAll(node) {
                if (node.children) {
                    node.children.forEach(toggleAll);
                    toggle(node);
                }
            }

            // toggle a single node
            function toggle(node) {
                if (node.children) {
                    node._children = node.children;
                    node.children = null;
                } else {
                    node.children = node._children;
                    node._children = null;
                }
            }

            // update nodes, used when nodes are toggled
            chart.update = function(localRoot) {
                var nodes = tree.nodes(root);

                // normalize distance between nodes
                nodes.forEach(function(d) {d.y = d.depth * pathLength;});

                //update nodes, give them an id if they don't have one
                var node = g.selectAll('g.node')
                    .data(nodes, function(d) {return d.id || (d.id = ++i);});

                var nodeEnter = node.enter().append('g')
                    .attr('class', 'node')
                    .attr('transform', function(d) {return 'translate(' + localRoot[positions.pos0_1] + ',' + localRoot[positions.pos0_2] + ')';})
                    .on('click', function(d) {toggle(d); chart.update(d);});

                nodeEnter.append('circle')
                    .attr('r', 1e-6)
                    .style('fill', function(d) {return d._children ? closedColor : expandedColor})
                    .style('stroke', selectableStrokeColor)
                    .style('stroke-width', function(d) {return d.children || d._children ? selectableStrokeWidth : 0})
                    .style('cursor', 'pointer');

                nodeEnter.append('text')
                    .attr(positions.pos_2, function(d) {return d.children || d._children ? 0 - radius - 5 : radius + 5;})
                    .attr('d' + positions.pos_1, '.35em')
                    .attr('text-anchor', function(d) {return d.children || d._children ? 'end' : 'start';})
                    .attr('transform', 'rotate(' + positions.rotation + ')')
                    .text(function(d) {return d.name;})
                    .style('fill-opacity', 1e-6);
                
                // transitions
                var nodeUpdate = node.transition()
                    .duration(animDuration)
                    .attr('transform', function(d) {return 'translate(' + d[positions.pos_1] + ',' + d[positions.pos_2] + ')';});
                
                nodeUpdate.select('circle')
                    .attr('r', radius)
                    .style('fill', function(d) {return d._children ? closedColor : expandedColor});

                nodeUpdate.select('text')
                    .style('fill-opacity', 1)
                    .style({
                        'color': textColor,
                        'font-size': fontSize + 'px'
                    })
                    .attr(positions.pos_2, function(d) {return d.children || d._children ? 0 - radius - 5 : radius + 5;})
                    .attr('d' + positions.pos_1, '.35em')
                    .attr('text-anchor', function(d) {return d.children || d._children ? 'end' : 'start';})
                    .attr('transform', 'rotate(' + positions.rotation + ')')
                    .text(function(d) {return d.name;});


                // Transition exiting nodes to the parent's new position.
                var nodeExit = node.exit().transition()
                    .duration(animDuration)
                    .attr('transform', function(d) { return 'translate(' + localRoot[positions.pos_1] + ',' + localRoot[positions.pos_2] + ')'; })
                    .remove();

                nodeExit.select('circle')
                    .attr('r', 1e-6);

                nodeExit.select('text')
                    .style('fill-opacity', 1e-6);

                // Update the links…
                var link = g.selectAll('path.link')
                    .data(tree.links(nodes), function(d) {return d.target.id;});

                // Enter any new links at the parent's previous position.
                link.enter().insert('path')
                    .attr('class', 'link')
                    .attr('d', function(d) {
                        var o = {x: localRoot.x, y: localRoot.y};
                        return diagonal({source: o, target: o});
                    })
                    .style({
                        'stroke-width': pathWidth + 'px',
                        'stroke': pathColor,
                        'fill': 'none'
                    })
                    .style()
                    .transition()
                    .duration(animDuration)
                    .attr('d', diagonal);

                // Transition links to their new position.
                link.transition()
                    .duration(animDuration)
                    .attr('d', diagonal);

                // Transition exiting nodes to the parent's new position.
                link.exit().transition()
                    .duration(animDuration)
                    .attr('d', function(d) {
                        var o = {x: localRoot.x, y: localRoot.y};
                        return diagonal({source: o, target: o});
                    })
                    .remove();

                // Stash the old positions for transition
                nodes.forEach(function(d) {
                    d.x0 = d.x;
                    d.y0 = d.y;
                });
            };

            chart.update(root);
        });
    };
    
    
    ////////////////////////
    // settings functions //
    ////////////////////////
    
    chart.height = function(value) {
        if(!arguments.length){
            return height;
        }
        
        height = value;
        return this;
    };

    chart.width = function(value) {
        if(!arguments.length){
            return width;
        }

        width = value;
        return this;
    };

    chart.expandedColor = function(value) {
        if(!arguments.length){
            return expandedColor;
        }

        expandedColor = value;
        return this;
    };

    chart.closedColor = function(value) {
        if(!arguments.length){
            return closedColor;
        }

        closedColor = value;
        return this;
    };

    chart.textColor = function(value) {
        if(!arguments.length){
            return textColor;
        }

        textColor = value;
        return this;
    };

    chart.animDuration = function(value) {
        if(!arguments.length){
            return animDuration;
        }

        animDuration = value;
        return this;
    };

    chart.radius = function(value) {
        if(!arguments.length){
            return radius;
        }

        radius = value;
        return this;
    };

    chart.sort = function(func) {
        sort = func;
        return this;
    };

    chart.orientation = function(value) {
        if(!arguments.length) {
            return orientation;
        }

        if(value == 'vertical') {
            positions = {pos_1: 'x', pos_2: 'y', pos0_1: 'x0', pos0_2: 'y0', rotation: 90};
            orientation = 'vertical';

        } else {
            positions = {pos_1: 'y', pos_2: 'x', pos0_1: 'y0', pos0_2: 'x0', rotation: 0};
            orientation = 'horizontal';
        }

        return this;
    };

    return chart;
};