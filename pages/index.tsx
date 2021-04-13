import React, { Component } from "react";
import { withRouter } from 'next/router';

class Home extends Component {

  constructor(props) {
    super(props);
    this.state = { name: '' };

    this.name = this.name.bind(this);
  }

  start = (e) => {
    e.preventDefault();
    sessionStorage.setItem('name', this.state.name);
    this.props.router.push('/pointing');
  }

  name = (e) => {
    this.setState(({
      name: e.target.value
    }))
  }

  render() {
    return (
      <main>
        <div className="big-input">
          <input type="text" placeholder="Name" onChange={this.name} value={this.state.name} /> 
          <button onClick={this.start}>Start</button> 
        </div>
      </main>
    );
  }
}

export default withRouter(Home);