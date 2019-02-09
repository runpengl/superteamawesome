import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import ReactEchartsCore from 'echarts-for-react/lib/core'
import echarts from 'echarts/lib/echarts'
import 'echarts/lib/chart/line'
import 'echarts/lib/component/title'
import 'echarts/lib/component/tooltip'
import 'echarts/lib/component/grid'
import 'echarts/lib/component/legend'
import 'echarts/lib/component/dataZoom'
import 'echarts/lib/component/toolbox'
import 'echarts/lib/chart/effectScatter'

import moment from 'moment'

import SolveProgressChartTooltip from "./SolveProgressChartTooltip";

const PUZZLES_SOLVED = "Puzzles Solved";
const PUZZLES_UNLOCKED = "Puzzles Unlocked";
const META_SOLVED = "META Solve";
const META_UNLOCK = "META Unlock";
const colorMap = {
    PURPLE: '#6c6ec6',
    RED: '#dc322f',
    ORANGE: '#b58901',
    GREEN: '#859901'
}

export default class SolveProgressChart extends Component {

    getPlottedTimestamps = (puzzleData) => {
        const plottedTimestamps = [];

        // Accumulate x-axis timestamps.
        puzzleData.forEach((puzzle) => {
            if (puzzle.solvedAt) {
                plottedTimestamps.push(new Date(puzzle.solvedAt));
            }
            if (puzzle.createdAt) {
                if ((puzzle.status === "solved" || puzzle.wasBacksolved === true) && !puzzle.solvedAt) {
                    console.warn(`${puzzle.key} has no official solve time.`);
                }
                plottedTimestamps.push(new Date(puzzle.createdAt));
            }
        });

        plottedTimestamps.sort((a, b) => {
            return a.getTime() - b.getTime();
        });

        const startTime = plottedTimestamps[0];
        const endTime = plottedTimestamps[plottedTimestamps.length - 1];
        let nextTime = moment(plottedTimestamps[0]).startOf('hour').toDate();
        while (nextTime.getTime() < endTime.getTime()) {
            nextTime = moment(nextTime).add(15, 'minutes').toDate();
            plottedTimestamps.push(nextTime);
        }
        plottedTimestamps.sort((a, b) => {
            return a.getTime() - b.getTime();
        });

        return plottedTimestamps;
    }

    getOption = ({ puzzleData }) => {
        const plottedTimestamps = this.getPlottedTimestamps(puzzleData);
        const startTime = plottedTimestamps[0];

        const cummulativeSolveData = plottedTimestamps
            .map((date) => {
                let numSolved = 0;
                let numUnlocked = 0;
                let metaSolved = 0;
                let metaUnlocked = 0;
                let solveTimeAccum = 0;
                const elapsedMins = moment.duration(moment(date).diff(moment(startTime))).asMinutes();
                const dataObj = {};
                puzzleData.forEach((puzzle) => {
                    if (puzzle.createdAt &&
                        new Date(puzzle.createdAt).getTime() <= date.getTime()) {
                        numUnlocked += 1;
                        if (puzzle.isMeta) {
                            metaUnlocked += 1;
                        }
                        if (puzzle.status === "solved" && puzzle.solvedAt &&
                            new Date(puzzle.solvedAt).getTime() <= date.getTime()) {
                            numSolved += 1;
                            if (puzzle.isMeta) {
                                metaSolved += 1;
                            }
                            if (!puzzle.solveTime) {
                                puzzle.solveTime = moment.duration(moment(puzzle.solvedAt).diff(moment(puzzle.createdAt))).asMinutes();
                            }
                            solveTimeAccum += puzzle.solveTime;
                        }
                    }
                    const solved = puzzle.solvedAt || 0;
                    const unlocked = puzzle.createdAt || 0;
                    if (date.getTime() === new Date(solved).getTime()) {
                        Object.assign(dataObj, { puzzle: puzzle, solved: true });
                    } else if (date.getTime() === new Date(unlocked).getTime()) {
                        Object.assign(dataObj, { puzzle: puzzle });
                    }
                });
                const avgSolveTimeMins = Math.round(solveTimeAccum / (numSolved || 1));
                Object.assign(dataObj, { numUnlocked, numSolved, metaSolved, metaUnlocked, elapsedMins, avgSolveTimeMins });
                dataObj.timestamp = date;
                return dataObj;
            });

        function getMarkPoint(item, index) {
            var puzzle = item.puzzle;
            var ret = {
                event: "META " + (item.solved ? "solved" : "unlocked"),
                value: item.solved ? item.numSolved : item.numUnlocked,
                symbol: 'diamond',
                itemStyle: {
                    color: item.solved ? colorMap.ORANGE : colorMap.RED
                }
            };
            return ret;
        }

        return {
            textStyle: {
                fontSize: 16
            },
            title: {
                text: '',
                left: '2%',
                top: '4%',
                textStyle: {
                    fontSize: 20,
                    fontWeight: 'normal',
                    color: 'white'
                }
            },
            xAxis: {
                data: plottedTimestamps,
                axisLabel: {
                    formatter: function(value, idx) {
                        const date = new Date(value);
                        const shortLabel = moment(date).format('hA');
                        const longLabel = moment(date).format('ddd. hA');
                        if (idx === 0) {
                            return longLabel;
                        }
                        if (date.getHours() % 12 <= 1) {
                            return longLabel;
                        }
                        return shortLabel;
                    },
                    fontSize: 12,
                    color: '#888',
                    rotate: 30
                },
                axisTick: {
                    show: true
                },
                boundaryGap: true,
                axisLine: {
                    lineStyle: {
                        color: '#ccc'
                    }
                }
            },
            yAxis: {
                splitNumber: 5,
                axisLabel: {
                    fontSize: 15,
                    color: '#ccc'
                },
                axisTick: {
                    show: true
                },
                axisLine: {
                    lineStyle: {
                        color: '#ccc'
                    }
                }
            },
            legend: {
                textStyle: {
                    color: 'white',
                    fontSize: 13
                },
                top: '5%',
                right: '5%',
                itemGap: 15,
            },
            grid: {
                top: '15%',
                left: '3%',
                right: '5%',
                bottom: '9%',
                containLabel: true
            },
            dataZoom: [{
                type: 'inside'
            }],
            tooltip: {
                trigger: 'axis',
                borderColor: '#ccc',
                borderWidth: 3,
                backgroundColor: 'rgba(255,255,255,0.9)',
                textStyle: {
                    color: 'black'
                },
                formatter: (params) => {
                    const numUnlocked = (params.find((param) => {
                        return param.seriesName === PUZZLES_UNLOCKED
                    }) || {}).data;
                    const numSolved = (params.find((param) => {
                        return param.seriesName === PUZZLES_SOLVED;
                    }) || {}).data;
                    const hoveredItem = cummulativeSolveData.find(item => {
                        return item.numSolved === numSolved && item.numUnlocked === numUnlocked;
                    });
                    if (!hoveredItem) return;
                    const mask = document.createElement('div');

                    ReactDOM.render(
                        <SolveProgressChartTooltip
                                dataItem={hoveredItem}
                                solveData={cummulativeSolveData}
                                colorMap={colorMap}
                            />, mask);

                    return mask.innerHTML;
                }
            },
            series: [{
                    type: 'line',
                    name: PUZZLES_UNLOCKED,
                    data: cummulativeSolveData.map((item) => { return item.numUnlocked }),
                    itemStyle: {
                        normal: {
                            color: colorMap.PURPLE
                        }

                    },
                    lineStyle: {
                        normal: {
                            width: 3
                        },
                        emphasis: {
                            width: 4
                        }
                    },
                    showSymbol: false,
                    showAllSymbol: false
                }, {
                    type: 'line',
                    name: PUZZLES_SOLVED,
                    data: cummulativeSolveData.map((item) => { return item.numSolved }),
                    itemStyle: {
                        normal: {
                            color: colorMap.GREEN
                        }
                    },
                    lineStyle: {
                        normal: {
                            width: 3
                        },
                        emphasis: {
                            width: 4
                        }
                    },
                    showSymbol: false,
                    showAllSymbol: true
                },
                {
                    name: META_UNLOCK,
                    type: 'effectScatter',
                    rippleEffect: {
                        period: 3,
                        scale: 3
                    },
                    symbolSize: 8,
                    symbol: 'diamond',
                    itemStyle: {
                        color: colorMap.RED
                    },
                    data: cummulativeSolveData.map((item, i) => { return (!item.solved && item.puzzle && item.puzzle.isMeta) ? getMarkPoint(item, i) : undefined }),
                },
                {
                    name: META_SOLVED,
                    type: 'effectScatter',
                    rippleEffect: {
                        period: 3,
                        scale: 3.5
                    },
                    symbolSize: 9,
                    symbol: 'diamond',
                    itemStyle: {
                        color: colorMap.ORANGE
                    },
                    data: cummulativeSolveData.map((item, i) => { return (item.solved && item.puzzle && item.puzzle.isMeta) ? getMarkPoint(item, i) : undefined }),
                },
            ],
            toolbox: {
                bottom: '3%',
                right: '5%',
                iconStyle: {
                    borderColor: 'white'
                },
                feature: {
                    dataZoom: {
                        title: {
                            zoom: 'Area zooming',
                            back: 'Restore area zooming'
                        },
                        yAxisIndex: 'none'
                    },
                    saveAsImage: {
                        title: 'Save image'
                    }
                }
            }
        };
    }

    render() {
        return (
            <div className="solve-progress-chart">
                    <ReactEchartsCore
                      echarts={echarts}
                      option={this.getOption(this.props)}
                      style={{ height: '600px' }}
                      className="react-for-echarts"
                    />
                </div>
        )
    }
}