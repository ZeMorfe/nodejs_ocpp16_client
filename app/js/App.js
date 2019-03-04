'use strict';

const e = React.createElement;

const layout = {
    display: 'grid',
    gridTemplateColumns: '50% 50%',
    gridColumnGap: '24px',
    width: '100%',
};

const App = () => {
    return (
        <div style={layout}>
            {e(window.Station, { stationId: 0 })}
            {e(window.Station, { stationId: 1 })}
        </div>
    )
};

const domContainer = document.querySelector('#app_container');
ReactDOM.render(<App />, domContainer);
