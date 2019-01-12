import * as React from "react";
import { IPuzzle } from "../store/state";

export interface IMetaSelectorProps {
    allPuzzles: IPuzzle[];
    puzzle: IPuzzle;
    onClose: () => void;
    onSave: (puzzle: IPuzzle, newParents: string[]) => void;
}

export interface IMetaSelectorState {
    selectedMetas: string[];
}

export class MetaSelector extends React.PureComponent<IMetaSelectorProps, IMetaSelectorState> {
    constructor(props: IMetaSelectorProps) {
        super(props);
        this.state = {
            selectedMetas:
                props.puzzle.parents !== undefined && props.puzzle.parents.length > 0
                    ? props.puzzle.parents
                    : props.puzzle.parent !== undefined
                    ? [props.puzzle.parent]
                    : [],
        };
    }
    public render() {
        return (
            <div className="meta-selector">
                <div>
                    <h3>Select the meta(s) for {this.props.puzzle.name}</h3>
                    {this.state.selectedMetas.map(selectedMeta => (
                        <div key={selectedMeta} className="selected-meta">
                            {this.props.allPuzzles.find(puzzle => puzzle.key === selectedMeta).name}
                            <button onClick={this.removePuzzle(selectedMeta)}>Remove</button>
                        </div>
                    ))}
                    <select onChange={this.handleMetaSelect} className="meta-selector-select">
                        <option>Add meta...</option>
                        {this.props.allPuzzles
                            .filter(
                                potentialMeta =>
                                    this.state.selectedMetas.indexOf(potentialMeta.key) < 0 && potentialMeta.isMeta,
                            )
                            .sort((puzzleA, puzzleB) => puzzleA.name.localeCompare(puzzleB.name))
                            .map(potentialMeta => (
                                <option key={potentialMeta.key} value={potentialMeta.key}>
                                    {potentialMeta.name}
                                </option>
                            ))}
                    </select>
                </div>
                <div className="meta-selector-footer">
                    <button onClick={this.props.onClose}>Cancel</button>
                    <button onClick={this.handleSave}>Save</button>
                </div>
            </div>
        );
    }

    private handleMetaSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
        this.setState({
            selectedMetas: Array.from(new Set(this.state.selectedMetas.concat(event.target.value))),
        });
    };

    private removePuzzle(puzzle: string) {
        return () =>
            this.setState({
                selectedMetas: this.state.selectedMetas.filter(meta => meta !== puzzle),
            });
    }

    private handleSave = () => this.props.onSave(this.props.puzzle, this.state.selectedMetas);
}
