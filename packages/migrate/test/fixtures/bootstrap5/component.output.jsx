import { Panel } from "react-bootstrap";
import React from "react";

const Card = ({ title, icon, onToggle }) => (
    <div className="card am-card">
        <div className="card-header float-start" data-bs-toggle="collapse" data-bs-target="#body">{ title }</div>
        <i className={ `fa fa-${icon}` } />
        <span className={ "text-body-secondary" }>Muted</span>
        <Panel className="panel panel-default">Component</Panel>
        <button className="btn btn-outline-primary" onClick={ onToggle }>Toggle</button>
    </div>
);

export default Card;
