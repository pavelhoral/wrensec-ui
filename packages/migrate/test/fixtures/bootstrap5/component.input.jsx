import { Panel } from "react-bootstrap";
import React from "react";

const Card = ({ title, icon, onToggle }) => (
    <div className="panel panel-default am-card">
        <div className="panel-heading pull-left" data-toggle="collapse" data-target="#body">{ title }</div>
        <i className={ `fa fa-${icon}` } />
        <span className={ "text-muted" }>Muted</span>
        <Panel className="panel panel-default">Component</Panel>
        <button className="btn btn-default" onClick={ onToggle }>Toggle</button>
    </div>
);

export default Card;
