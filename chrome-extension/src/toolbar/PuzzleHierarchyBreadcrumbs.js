import * as React from "react";

export default function PuzzleHierarchyBreadcrumbs(props) {
    if (!props.hierarchy || props.hierarchy.length <= 1) {
        return null;
    }
    return <div className="PuzzleHierarchyBreadcrumbs">
        {props.hierarchy.map(puzzle => {
            return <a
                key={puzzle.key}
                className="PuzzleHierarchyBreadcrumbs-puzzle"
                target="_parent"
                href={`http://${props.hunt.domain}${puzzle.path}`}
            >
                <div className="PuzzleHierarchyBreadcrumbs-tooltip">{puzzle.name}</div>
            </a>
        })}
    </div>;
}
