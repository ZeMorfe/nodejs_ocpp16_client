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
        {
            CP.map((cp, idx) => (
                e(window.Station, { stationProps: cp, stationId: idx })
            ))
        }
        </div>
    )
};

const domContainer = document.querySelector('#app_container');
ReactDOM.render(<App />, domContainer);
