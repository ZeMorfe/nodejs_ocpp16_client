'use strict';

const e = React.createElement;

const App = () => {
    return (
        e(
            'div',
            {},
            e(window.Station, { stationId: 0 })
        )
    )
};

const domContainer = document.querySelector('#app_container');
ReactDOM.render(<App />, domContainer);
