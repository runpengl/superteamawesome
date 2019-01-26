import React, { Component } from 'react'
import PropTypes from 'prop-types'
import moment from 'moment'

function getSolveTimeDisplay(item) {
    if (!item.avgSolveTimeMins) return '\u2014';
    const solveTimeMins = item.avgSolveTimeMins;
    if (solveTimeMins <= 60) {
        return `${solveTimeMins} min`;
    }
    const solveTimeHr = Math.floor(solveTimeMins / 60);
    const solveTimeMin = solveTimeMins % 60;
    return `${solveTimeHr}h ${solveTimeMin}m`;
}

function getSolveRateDisplay(item, solveData, windowSize) {
    if (!item.numSolved) return '\u2014';
    // Get start of window (last `windowSize` hrs).
    const windowStart = solveData.find((dataObj) => {
        return moment.duration(moment(item.timestamp).diff(moment(dataObj.timestamp))).asHours() <= windowSize;
    });
    if (!windowStart) return '\u2014';

    const windowDurationMins = moment.duration(moment(item.timestamp).diff(moment(windowStart.timestamp))).asMinutes();
    const numSolved = item.numSolved - windowStart.numSolved;

    return (60 * numSolved / windowDurationMins).toPrecision(2) + " / hr";
}

const SolveProgressChartTooltip = ({
    dataItem,
    solveData,
    colorMap,
    style,
    showTip
}) => {
    return (
        <div className={`solveprogress-tooltip ${showTip ? 'with-tip' : ''}`} style={style}>
            <span className='date-label'>{ moment(dataItem.timestamp).format('ddd, MMM D h:mm A') }</span>
            <small>&nbsp; ({(dataItem.elapsedMins / 60).toPrecision(3)} hrs)</small>
            <br/> <br/>
            <div className='col'>
                <div><span className='series-label'>Puzzles</span></div>
                <div className='row border-bottom'>
                    <div className='before'>
                        <span className='statnum' style={{ color: colorMap.PURPLE }}>{ dataItem.numUnlocked || '\u2014' }</span>
                        <p>Total unlocked</p>
                    </div>
                       <div className='before'>
                        <span className='statnum' style={{ color: colorMap.GREEN }}>{ dataItem.numSolved || '\u2014' }</span>
                        <p>Total solved</p>
                    </div>
                       <div className='before'>
                        <span className='statnum' style={{ color: colorMap.RED }}>{ dataItem.metaUnlocked || '\u2014' }</span>
                        <p>META unlocked</p>
                    </div>
                       <div>
                        <span className='statnum' style={{ color: colorMap.ORANGE }}>{ dataItem.metaSolved || '\u2014' }</span>
                        <p>META solves</p>
                    </div>
                </div>

                <div><span className='series-label'>Velocity</span></div>
                <div className='row'>
                    <div className='before'>
                        <span className='statnum' style={{ color: colorMap.PURPLE }}>{ getSolveRateDisplay(dataItem, solveData, 4) }</span>
                        <p>avg. solve rate</p><small>(last 4 hrs)</small>
                    </div>
                    <div>
                        <span className='statnum' style={{ color: colorMap.GREEN }}>{ getSolveTimeDisplay(dataItem) }</span>
                        <p>avg. solve time</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

SolveProgressChartTooltip.propTypes = {
    dataItem: PropTypes.object,
    solveData: PropTypes.object,
    colorMap: PropTypes.object,
    style: PropTypes.object,
    showTip: PropTypes.bool
}

export default SolveProgressChartTooltip