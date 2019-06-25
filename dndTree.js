var json = "claimCategories.json"



treeJSON = d3.json(json, function(error, treeData) {

    var currentClaim;
    var clipboardList = [];
    // Calculate total nodes, max label length
    var totalNodes = 0;
    var maxLabelLength = 0;
    // variables for drag/drop
    var selectedNode = null;
    var draggingNode = null;
    // panning variables
    var panSpeed = 200;
    var panBoundary = 20; // Within 20px from edges will pan when dragging.
    // Misc. variables
    var i = 0;
    var duration = 750;
    var root;

    // size of the diagram
    var viewerWidth = 1300;
    var viewerHeight = 800;

    var tree = d3.layout.tree()
        .size([viewerHeight, viewerWidth]);

    // define a d3 diagonal projection for use by the node paths later on.
    var diagonal = d3.svg.diagonal()
        .projection(function(d) {
            return [d.y, d.x];
        });

    // A recursive helper function for performing some setup by walking through all nodes

    function visit(parent, visitFn, childrenFn) {
        if (!parent) return;

        visitFn(parent);

        var children = childrenFn(parent);
        if (children) {
            var count = children.length;
            for (var i = 0; i < count; i++) {
                visit(children[i], visitFn, childrenFn);
            }
        }
    }

    // Call visit function to establish maxLabelLength
    visit(treeData, function(d) {
        totalNodes++;
        maxLabelLength = Math.max(d.name.length, maxLabelLength);

    }, function(d) {
        return d.children && d.children.length > 0 ? d.children : null;
    });


    // sort the tree according to the node names

    function sortTree() {
        tree.sort(function(a, b) {
            return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1;
        });
    }
    // Sort the tree initially incase the JSON isn't in a sorted order.
    sortTree();

    // TODO: Pan function, can be better implemented.

    function pan(domNode, direction) {
        var speed = panSpeed;
        if (panTimer) {
            clearTimeout(panTimer);
            translateCoords = d3.transform(svgGroup.attr("transform"));
            if (direction == 'left' || direction == 'right') {
                translateX = direction == 'left' ? translateCoords.translate[0] + speed : translateCoords.translate[0] - speed;
                translateY = translateCoords.translate[1];
            } else if (direction == 'up' || direction == 'down') {
                translateX = translateCoords.translate[0];
                translateY = direction == 'up' ? translateCoords.translate[1] + speed : translateCoords.translate[1] - speed;
            }
            scaleX = translateCoords.scale[0];
            scaleY = translateCoords.scale[1];
            scale = zoomListener.scale();
            svgGroup.transition().attr("transform", "translate(" + translateX + "," + translateY + ")scale(" + scale + ")");
            d3.select(domNode).select('g.node').attr("transform", "translate(" + translateX + "," + translateY + ")");
            zoomListener.scale(zoomListener.scale());
            zoomListener.translate([translateX, translateY]);
            panTimer = setTimeout(function() {
                pan(domNode, speed, direction);
            }, 50);
        }
    }

    // Define the zoom function for the zoomable tree

    function zoom() {
        svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }


    // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
    var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

    function initiateDrag(d, domNode) {
        draggingNode = d;
        d3.select(domNode).select('.ghostCircle').attr('pointer-events', 'none');
        d3.selectAll('.ghostCircle').attr('class', 'ghostCircle show');
        d3.select(domNode).attr('class', 'node activeDrag');

        svgGroup.selectAll("g.node").sort(function(a, b) { // select the parent and sort the path's
            if (a.id != draggingNode.id) return 1; // a is not the hovered element, send "a" to the back
            else return -1; // a is the hovered element, bring "a" to the front
        });
        // if nodes has children, remove the links and nodes
        if (nodes.length > 1) {
            // remove link paths
            links = tree.links(nodes);
            nodePaths = svgGroup.selectAll("path.link")
                .data(links, function(d) {
                    return d.target.id;
                }).remove();
            // remove child nodes
            nodesExit = svgGroup.selectAll("g.node")
                .data(nodes, function(d) {
                    return d.id;
                }).filter(function(d, i) {
                    if (d.id == draggingNode.id) {
                        return false;
                    }
                    return true;
                }).remove();
        }

        // remove parent link
        parentLink = tree.links(tree.nodes(draggingNode.parent));
        svgGroup.selectAll('path.link').filter(function(d, i) {
            if (d.target.id == draggingNode.id) {
                return true;
            }
            return false;
        }).remove();

        dragStarted = null;
    }

    // define the baseSvg, attaching a class for styling and the zoomListener
    var baseSvg = d3.select("#tree-container").append("svg")
        .attr("width", viewerWidth)
        .attr("height", viewerHeight)
        .attr("class", "overlay")
        .call(zoomListener);


    // Define the drag listeners for drag/drop behaviour of nodes.
    dragListener = d3.behavior.drag()
        .on("dragstart", function(d) {
            if (d == root) {
                return;
            }
            dragStarted = true;
            nodes = tree.nodes(d);
            d3.event.sourceEvent.stopPropagation();
            // it's important that we suppress the mouseover event on the node being dragged. Otherwise it will absorb the mouseover event and the underlying node will not detect it d3.select(this).attr('pointer-events', 'none');
        })
        .on("drag", function(d) {
            if (d == root) {
                return;
            }
            if (dragStarted) {
                domNode = this;
                initiateDrag(d, domNode);
            }

            // get coords of mouseEvent relative to svg container to allow for panning
            relCoords = d3.mouse($('svg').get(0));
            if (relCoords[0] < panBoundary) {
                panTimer = true;
                pan(this, 'left');
            } else if (relCoords[0] > ($('svg').width() - panBoundary)) {

                panTimer = true;
                pan(this, 'right');
            } else if (relCoords[1] < panBoundary) {
                panTimer = true;
                pan(this, 'up');
            } else if (relCoords[1] > ($('svg').height() - panBoundary)) {
                panTimer = true;
                pan(this, 'down');
            } else {
                try {
                    clearTimeout(panTimer);
                } catch (e) {

                }
            }

            d.x0 += d3.event.dy;
            d.y0 += d3.event.dx;
            var node = d3.select(this);
            node.attr("transform", "translate(" + d.y0 + "," + d.x0 + ")");
            updateTempConnector();
        }).on("dragend", function(d) {
            if (d == root) {
                return;
            }
            domNode = this;
            if (selectedNode) {
                // now remove the element from the parent, and insert it into the new elements children
                var index = draggingNode.parent.children.indexOf(draggingNode);
                if (index > -1) {
                    draggingNode.parent.children.splice(index, 1);
                }
                if (typeof selectedNode.children !== 'undefined' || typeof selectedNode._children !== 'undefined') {
                    if (typeof selectedNode.children !== 'undefined') {
                        selectedNode.children.push(draggingNode);
                    } else {
                        selectedNode._children.push(draggingNode);
                    }
                } else {
                    selectedNode.children = [];
                    selectedNode.children.push(draggingNode);
                }
                // Make sure that the node being added to is expanded so user can see added node is correctly moved
                expand(selectedNode);
                sortTree();
                endDrag();
            } else {
                endDrag();
            }
        });

    function endDrag() {
        selectedNode = null;
        d3.selectAll('.ghostCircle').attr('class', 'ghostCircle');
        d3.select(domNode).attr('class', 'node');
        // now restore the mouseover event or we won't be able to drag a 2nd time
        d3.select(domNode).select('.ghostCircle').attr('pointer-events', '');
        updateTempConnector();
        if (draggingNode !== null) {
            update(root);
            centerNode(draggingNode);
            draggingNode = null;
        }
    }

    // Helper functions for collapsing and expanding nodes.

    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
    }

    function expand(d) {
        if (d._children) {
            d.children = d._children;
            d.children.forEach(expand);
            d._children = null;
        }
    }

    var overCircle = function(d) {
        selectedNode = d;
        updateTempConnector();
    };
    var outCircle = function(d) {
        selectedNode = null;
        updateTempConnector();
    };

    // Function to update the temporary connector indicating dragging affiliation
    var updateTempConnector = function() {
        var data = [];
        if (draggingNode !== null && selectedNode !== null) {
            // have to flip the source coordinates since we did this for the existing connectors on the original tree
            data = [{
                source: {
                    x: selectedNode.y0,
                    y: selectedNode.x0
                },
                target: {
                    x: draggingNode.y0,
                    y: draggingNode.x0
                }
            }];
        }
        var link = svgGroup.selectAll(".templink").data(data);

        link.enter().append("path")
            .attr("class", "templink")
            .attr("d", d3.svg.diagonal())
            .attr('pointer-events', 'none');

        link.attr("d", d3.svg.diagonal());

        link.exit().remove();
    };

    // Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving with large amount of children.

    function centerNode(source) {
        scale = zoomListener.scale();
        x = -source.y0;
        y = -source.x0;
        x = x * scale + viewerWidth / 3;
        y = y * scale + viewerHeight / 3;
        d3.select('g').transition()
            .duration(duration)
            .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
        zoomListener.scale(scale);
        zoomListener.translate([x, y]);

        //  If the popup assigment is not lit, make it white:
        if (!assignment.classList.contains('md-inactive')) {toggleClipboard()};
    }

    //finds ind and dep claim tags and makes them bold

    function boldClaims() {
        var claimText = document.getElementById("claim-text")
        claimText.innerHTML = claimText.innerHTML.split('[IC]').join('<b>Independent Claim:</b>')
        claimText.innerHTML = claimText.innerHTML.split('[DC]').join('<b>Dependent Claim:</b>')
        claimText.innerHTML = claimText.innerHTML.split('Source:').join('<b>Source:</b>')
    }

    // Returns true if a given claim is already in the clipboard

    function inClipboard(claim) {
        for (var i=0;i<clipboardList.length;i++) {
            if (clipboardList[i].id == claim.id) {return true}
        }
        return false;
    }

    //  If the popup is leftBound then make it rightBound and not lit, etc

    function togglePopup() {
        var popupLocation = popupContainer.style.right;
        if (popupLocation == leftBound) {
            popupContainer.style.right = rightBound;
            viewHeadline.classList.add('md-inactive');
        }
        else if (currentClaim) {
            popupContainer.style.right = leftBound;
            viewHeadline.classList.remove('md-inactive');
        }
    }

    //  If the clipboard button does not say added, switch it to added

    function toggleClipboardbutton() {
        if (clipboardButton.classList.contains("added")) {
          clipboardButton.classList.remove("added");
          addtoClipboard.style.left = "0%";
          addedText.style.left = "100%";
        }
        else {
          clipboardButton.classList.add("added");
          addtoClipboard.style.left = "-100%";
          addedText.style.left = "0%";
        }
    }

    //  If the popup is leftBound then make it rightBound and not lit, etc

    function toggleClipboard() {
        var clipboardLocation = clipboardContainer.style.right;
        if (clipboardLocation == leftBound) {
            clipboardContainer.style.right = rightBound;
            assignment.classList.add('md-inactive');
        }
        else {
            clipboardContainer.style.right = leftBound;
            assignment.classList.remove('md-inactive');
        }
    }

    // Detect whether the currently selected claim is in the clipboard
    // If it is, then change the clipboard button to added

    function updateClipboardbutton() {
        var inClip = inClipboard(currentClaim);
        var addedButton = clipboardButton.classList.contains("added");
        if (inClip && !addedButton) {toggleClipboardbutton()}
        if (!inClip && addedButton) {toggleClipboardbutton()}
    }

    //  Add the current claim to the clipboard list

    function addCurrentclaim() {
      if (!inClipboard(currentClaim)) {
          clipboardList.push(currentClaim);
      }
      var clipboardText = clipboardList.map(function (obj) {return '<li class="clipboardItem">'+obj.name+'</li>';});
      document.getElementsByClassName("clipboard-text")[0].innerHTML=clipboardText.join('');
      updateClipboardbutton();
    }

    function makeWorddoc() {
        generate(clipboardList);
    }


    //  Right and left bounds determine where the popup and clipboard move

    var rightBound = "-20%";
    var leftBound = "5.8%";
    var popupContainer = document.getElementById("pop-up-container");
    var clipboardContainer = document.getElementById("clipboard-container");
    var clipboardButton = document.getElementsByClassName("clipboard-button")[0];
    var saveButton = document.getElementsByClassName("save-button")[0];
    var addtoClipboard = document.getElementsByClassName("add-to-clipboard")[0];
    var addedText = document.getElementsByClassName("added-text")[0];
    var viewHeadline = document.getElementById("view_headline");
    var assignment = document.getElementById("assignment");


    document.getElementsByClassName("pop-up-x-button")[0].addEventListener('click', togglePopup, false);
    document.getElementsByClassName("clipboard-x-button")[0].addEventListener('click', toggleClipboard, false);
    clipboardButton.addEventListener('click', addCurrentclaim, false);
    viewHeadline.addEventListener('click', togglePopup, false);
    assignment.addEventListener('click', toggleClipboard, false);
    saveButton.addEventListener('click', makeWorddoc, false);





    //  This is the section for the header animation cause I was feelin ~fancy~

    var header = document.getElementsByClassName("header")[0];
    var titleContainer = document.getElementsByClassName("title-container")[0];
    function titleAnimation() {
        titleContainer.style.width ="67vh";
        window.setTimeout(twoseconds,2500);
        window.setTimeout(threeseconds,4500);
    }

    function twoseconds() {
        titleContainer.style.width ="0px";}

    function threeseconds() {
        var visibleTitle = document.getElementsByClassName("title-visible")[0];
        var hiddenTitle = document.getElementsByClassName("title-hidden")[0];
        visibleTitle.classList.remove('title-visible');
        visibleTitle.classList.add('title-hidden');
        hiddenTitle.classList.remove('title-hidden');
        hiddenTitle.classList.add('title-visible');
        titleContainer.style.transition ="1.5s";
        titleContainer.style.width ="12vh";
    }

    //  Set the claims box text with whatever was clicked
    function setClaims(d) {
      var claimName = document.getElementById("claim-name");
      var claimText = document.getElementById("claim-text");
      claimName.innerHTML=d.name+'<br>Exemplary Claim';
      claimText.innerHTML=
      '<div class="claim-reason">'+d.claimReason+"</div>"+
      '<div class="ind-claim">' + d.indClaim + '</div>' +
      '<div class="dep-claim">' + d.depClaim + '</div>' +
      '<div class="source">' + d.source + '</div>';
      boldClaims();
      currentClaim = d;
      currentClaim.claimText = (claimName.innerHTML+claimText.innerHTML);
      if (viewHeadline.classList.contains("md-inactive")) {togglePopup()};
      updateClipboardbutton();

    }


    // Toggle children function

    function toggleChildren(d) {
        if (d.indClaim) {
          setClaims(d);
        }
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else if (d._children) {
            d.children = d._children;
            d._children = null;
        }
        return d;
    }

    // Toggle children on click.

    function click(d) {
        if (d3.event.defaultPrevented) return; // click suppressed
        d = toggleChildren(d);
        update(d);
        centerNode(d);
    }

    function update(source) {
        // Compute the new height, function counts total children of root node and sets tree height accordingly.
        // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
        // This makes the layout more consistent.
        var levelWidth = [1];
        var childCount = function(level, n) {

            if (n.children && n.children.length > 0) {
                if (levelWidth.length <= level + 1) levelWidth.push(0);

                levelWidth[level + 1] += n.children.length;
                n.children.forEach(function(d) {
                    childCount(level + 1, d);
                });
            }
        };
        childCount(0, root);
        var newHeight = d3.max(levelWidth) * 20; // 20 pixels per line
        tree = tree.size([newHeight, viewerWidth]);

        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse(),
            links = tree.links(nodes);

        // Set widths between levels based on maxLabelLength.
        nodes.forEach(function(d) {
            d.y = (d.depth * (maxLabelLength * 7)); //maxLabelLength * 10px
            // alternatively to keep a fixed scale one can set a fixed depth per level
            // Normalize for fixed-depth by commenting out below line
            // d.y = (d.depth * 500); //500px per level.
        });

        // Update the nodes…
        node = svgGroup.selectAll("g.node")
            .data(nodes, function(d) {
                return d.id || (d.id = ++i);
            });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
            .call(dragListener)
            .attr("class", "node")
            .attr("transform", function(d) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .on('click', click);

        nodeEnter.append("circle")
            .attr('class', 'nodeCircle')
            .attr("r", 0)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        nodeEnter.append("text")
            .attr("font-weight", function(d) {
              return d.indClaim ? "bold":"none";
            })


            .attr("x", function(d) {
                return d.children || d._children ? -10 : 10;
            })
            .attr("dy", ".35em")
            .attr('class', 'nodeText')
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(function(d) {
                return d.name;
            })
            .style("fill-opacity", 0);

        // phantom node to give us mouseover in a radius around it
        nodeEnter.append("circle")
            .attr('class', 'ghostCircle')
            .attr("r", 30)
            .attr("opacity", 0.2) // change this to zero to hide the target area
        .style("fill", "red")
            .attr('pointer-events', 'mouseover')
            .on("mouseover", function(node) {
                overCircle(node);
            })
            .on("mouseout", function(node) {
                outCircle(node);
            });

        // Update the text to reflect whether node has children or not.
        node.select('text')
            .attr("x", function(d) {
                return d.children || d._children ? -10 : 10;
            })
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(function(d) {
                return d.name;
            });

        // Change the circle fill depending on whether it has children and is collapsed
        node.select("circle.nodeCircle")
            .attr("r", 4.5)
            .style("stroke", function(d) {
                return d.color})
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        // Fade the text in
        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + source.y + "," + source.x + ")";
            })
            .remove();

        nodeExit.select("circle")
            .attr("r", 0);

        nodeExit.select("text")
            .style("fill-opacity", 0);

        // Update the links…
        var link = svgGroup.selectAll("path.link")
            .data(links, function(d) {
                return d.target.id;
            });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
                var o = {
                    x: source.x0,
                    y: source.y0
                };
                return diagonal({
                    source: o,
                    target: o
                });
            });

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function(d) {
                var o = {
                    x: source.x,
                    y: source.y
                };
                return diagonal({
                    source: o,
                    target: o
                });
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    // Append a group which holds all nodes and which the zoom Listener can act upon.
    var svgGroup = baseSvg.append("g");

    // Define the root
    root = treeData;
    root.x0 = viewerHeight / 2;
    root.y0 = 0;

    // Layout the tree initially and center on the root node.
    update(root);
    centerNode(root);
    window.setTimeout(titleAnimation,1000);

    var searchTerm;

    //  Generates the search list using a recursive function
    //  You must pass in the overarching category you want to generate from

    function makeSearch(d) {

        var lisClass = 'lis';
        if (d.indClaim) {lisClass = 'lis bolded'};

        if (d.children) {
            var prebuiltResults = "<ol class='ols'><li class='"+lisClass+"' id='"+d.id+"'>"+d.name+'</li>'+d.children.map(makeSearch).join('')+'</ol>';
            return prebuiltResults.toUpperCase().includes(searchTerm.toUpperCase()) ? prebuiltResults : '';}
        else if (d._children ) {
            var prebuiltResults = "<ol class='ols'><li class='"+lisClass+"' id='"+d.id+"'>"+d.name+'</li>'+d._children.map(makeSearch).join('')+'</ol>';
            return prebuiltResults.toUpperCase().includes(searchTerm.toUpperCase()) ? prebuiltResults : '';}
        else {
            var prebuiltResults = "<ol class='ols'><li class='"+lisClass+"' id='"+d.id+"'>"+d.name+'</li></ol>';
            return prebuiltResults.toUpperCase().includes(searchTerm.toUpperCase()) ? prebuiltResults : '';}
    };


    //  Update the search tree by highlighting anything in the box

    function updateSearch() {
        searchTerm = document.getElementById("search-bar").value;
        var searchResults = makeSearch(treeData);
        document.getElementsByClassName("search-results")[0].innerHTML = searchResults;
        $(".lis*").highlight(searchTerm, "highlight");


        //  Make the nodes on the search tree clickable

        var anchors = document.getElementsByClassName('lis');
        for(var i = 0; i < anchors.length; i++) {
            var anchor = anchors[i];
            anchor.onclick = function() {
                currentID = this.id;
                centerID(treeData);
            }
        }
    }


    //  Each node has an id, this function will center the node with a given id

    function centerID(d) {
        if (currentID == d.id) {
            centerNode(d);
            if (d.indClaim) {setClaims(d)};}
        else if (d.children) {d.children.forEach(centerID)}
        else if (d._children) {d._children.forEach(centerID)}
    }

    document.getElementById("search-bar").addEventListener('input', updateSearch, false);
    updateSearch();


});
