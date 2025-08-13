import React from 'react';
export default class ErrorBoundary extends React.Component{
  constructor(p){ super(p); this.state={error:null,info:null}; }
  static getDerivedStateFromError(e){ return {error:e}; }
  componentDidCatch(e,i){ this.setState({info:i}); console.error('ErrorBoundary', e, i); }
  render(){
    if(this.state.error){
      return <div style={{padding:16}}>
        <h2>Something went wrong.</h2>
        <pre style={{whiteSpace:'pre-wrap',background:'#fee',padding:12,border:'1px solid #fbb',borderRadius:8}}>
          {String(this.state.error?.stack||this.state.error)}
        </pre>
        {this.state.info && <details><summary>Component stack</summary><pre>{this.state.info.componentStack}</pre></details>}
      </div>;
    }
    return this.props.children;
  }
}
