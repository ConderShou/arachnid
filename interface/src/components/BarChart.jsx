import React, { Component } from 'react';
import { scaleLinear } from 'd3-scale';
import { max, sum, mean } from 'd3-array';
import { select, selectAll, event as currentEvent } from 'd3-selection';
import { legendColor } from 'd3-svg-legend';
import { transition } from 'd3-transition';
import { axisBottom, axisRight} from 'd3-axis';
import { drag } from 'd3-drag';

import { ProcessYelpData } from '../utils/processData';
// import * as d3 from 'd3';

import '../styles/components/barchart.css';

class BarChart extends Component {
    constructor(props) {
        super(props);

        this.state = {
            currentDatum: [],
            mouseover: false,
            dragging: false,
            barWidth: 0,
            originalX: 0,
            originalY: 0,
            updateDimensions: false,
            selectedRect: null
        }

        this._updateDimensions = this._updateDimensions.bind(this);

        this.createBarChart = this.createBarChart.bind(this);
        this.handleDown = this.handleDown.bind(this);
        this.handleMouseOut = this.handleMouseOut.bind(this);
        this.handleMouseOver = this.handleMouseOver.bind(this);
        this.handleDragEnd = this.handleDragEnd.bind(this);
        this.handleDragStart = this.handleDragStart.bind(this);
        this.triggerDragBoundary = this.triggerDragBoundary.bind(this);
    }

    _updateDimensions() {

        console.log("Updating dimensions...");

        const { updateDimensions } = this.props;
        const screenWidth = window.innerWidth / 2;
        const screenHeight = (window.innerHeight - 120) / 2;

        updateDimensions(screenWidth, screenHeight);
    }
    componentWillMount() {
        this._updateDimensions();
    }

    componentDidMount() {
        this.createBarChart();
        window.addEventListener("resize", this._updateDimensions);
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this._updateDimensions);
    }

    componentDidUpdate() {
        console.log("UPDATING VIZ...");
        this.createBarChart();
    }

    shouldComponentUpdate(nextProps, nextState) {

        if (nextProps.update !== this.props.update) {
            return true; 
        }

        return false;
    }

    createBarChart() {
        const { chartData, size } = this.props;

        const node = this.node;
        const dataMax = max(chartData.map(d => mean(d.review_count)));
        const barWidth = (size[0] - 20) / chartData.length + 10;
        const yScale = scaleLinear().domain([0, dataMax]).range([0, size[1]]);

        // const totalBarSpace = barWidth + 20; 

        this.setState({ barWidth });

        // Need to fix this axis stuff
        const xScale = scaleLinear().domain([0, chartData.length]);

        var xAxis = axisBottom().scale(xScale);
        var yAxis = axisRight().scale(yScale);

        select(node).append('svg').append('g').attr('id', 'BC-xAxis').attr('transform', 'translate(0, ' + size[1] + ')').call(xAxis);

        select(node).append('svg').append('g').attr('id', 'BC-yAxis').call(yAxis);
        
        //Drag Action for Bar
        var dragAction = drag()
                            .on('start', this.handleDragStart)
                            .on('drag', this.handleDragging)
                            .on('end', this.handleDragEnd)

        select(node)
            .selectAll('rect.bc-bar')
            .data(chartData)
            .enter()
            .append('rect')
                .attr('class', 'bc-bar')
        
        select(node)
            .selectAll('rect.bc-bar')
            .data(chartData)
            .exit()
                .remove()

        select(node)
            .selectAll('rect.bc-bar')
            .data(chartData)
                .attr('x', (d, i) => i * (barWidth))
                .attr('y', d => (size[1] + 300) - yScale(mean(d.review_count)))
                .attr('height', d => yScale(mean(d.review_count)))
                .attr('width', barWidth)
                .style('fill', (d, i) => 'blue')
                .style('stroke', 'black')
                .on('mouseover', this.handleMouseOver)
                .on('mouseout', this.handleMouseOut)
                .on('mouseup', this.handleUp)
                .on('mousedown', this.handleDown)
                .call(dragAction);

    }

    handleDragStart(d) {
        const { updateCurrentDatum } = this.props;
        updateCurrentDatum([d]);
    }

    // handleDraggingContainer(d) {
    //     handleDragging(d);

    // }
    
    handleDragging(d) {
        var bar = select(this);

        bar.lower();
        //Update position of bar by adding drag distance to each coordinate
        bar.attr('x', d.x = currentEvent.x)
            .attr('y', d.y = currentEvent.y)
            .classed('bc-active-bar', true);
    }

    triggerDragBoundary(d) {
        // const { originalX, totalBarSpace } = this.state;

        // const upperLimit = originalX + totalBarSpace;
        // const lowerLimit = originalX - totalBarSpace;

       
        // if (d.x > upperLimit) {
        //     console.log("LIMIT")
        //     select(this.node)
        //         .selectAll('rect.bc-bar')
        //             .filter(function(_d, i) {
        //                 const overlapBarSpace = i * totalBarSpace;
        //                 return (d.business_id !== _d.business_id) && (overlapBarSpace >= (upperLimit - 10) && overlapBarSpace <= (upperLimit + 10));
        //             })
        //             .style('fill', 'red');

        // } else if (d.x)

    }


    handleDown(d, i) {

        var selectedRect = select(this.node) 
            .selectAll('rect.bc-bar')
                .filter(function(_d, i) {
                    return (d.business_id === _d.business_id);
                })._groups[0][0];

        select(selectedRect).style('fill', 'red');

        const originalX = select(selectedRect).attr('x');
        const originalY = select(selectedRect).attr('y');

        this.setState({ 
            selectedRect,
            originalX, 
            originalY });
    }

    handleUp(d) {
        console.log('up');
        var bar = select(this);

        bar.style('fill', 'blue');
    }

    handleDragEnd(d) {
        const { mouseover, originalX, originalY, selectedRect } = this.state;
        const { updateCurrentDatum, currentDatum } = this.props;

        var deduped = false;

        if (mouseover && currentDatum.length > 1) {
            console.log("DEDUP");
        
            var arrayIDs = [];
            currentDatum.map(datum => {
                arrayIDs.push({id: datum.business_id, count: datum.review_count});
            });
            const newData = ProcessYelpData(this.props.chartData, 'business_id', arrayIDs);
            this.props.updateData(newData);
            deduped = true;
        } else {
            var t = transition().duration(100);

            select(selectedRect)
                .transition(t)
                .attr('x', originalX)
                .attr('y', originalY);
        }

        updateCurrentDatum([]);

        select(selectedRect)
            .style('fill', 'blue');

    }


    handleMouseOver(d) {
        const { updateCurrentDatum, currentDatum } = this.props;

        // if (currentDatum.length == 0) { return; }

        if (currentDatum.length > 0 && d.business_id !== currentDatum[0].business_id) {
            console.log("Hovering Different Element", d);
            var newDatum = currentDatum;
            newDatum.push(d);

            this.setState({ mouseover: true });
            updateCurrentDatum(newDatum);

            select(this.node)
                .selectAll('rect.bc-bar')
                    .filter(function(_d, i) {
                        return (d.business_id === _d.business_id);
                    })
                    .style('fill', '#27ae60');
        }
    }

    handleMouseOut(d) {
        const { updateCurrentDatum, currentDatum } = this.props;

        // if (currentDatum.length == 0) { return; }

        if (currentDatum.length > 0 && d.business_id !== currentDatum[0].business_id) {
            console.log("Mouse Out on Diff Element");
            var newDatum = currentDatum;
            newDatum.pop(d);

            this.setState({ mouseover: false });
            updateCurrentDatum(newDatum);

            select(this.node)
                .selectAll('rect.bc-bar')
                    .filter(function(_d, i) {
                        return (d.business_id === _d.business_id);
                    })
                    .style('fill', 'blue');
        }
    }

    render() {
        const { size } = this.props;

        return <svg className="bc-barChart" ref={node => this.node = node} width={size[0]} height={size[1] + 300}> </svg>
    }
}

export default BarChart;