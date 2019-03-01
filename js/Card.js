
window.Card = (props) => {
    const dotStyle = {
        height: '25px',
        width: '25px',
        backgroundColor: props.charging ? '4CAF50' : 'grey',
        borderRadius: '50%',
        display: 'inline-block',
        marginLeft: '16px'
    };
    const headerStyle = {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center'
    };
    return (
        <div className="mdc-card demo-card">
            <div className="mdc-card__primary-action demo-card__primary-action" style={{ padding: "12px" }}>
                {/* <div className="mdc-card__media mdc-card__media--16-9 demo-card__media" style="background-image: url(&quot;https://material-components.github.io/material-components-web-catalog/static/media/photos/3x2/2.jpg&quot;);"></div> */}
                <div className="demo-card__primary">
                    <h2 className="demo-card__title mdc-typography mdc-typography--headline6" style={headerStyle}>
                        {props.header} <span style={dotStyle} />
                    </h2>
                    <h3 className="demo-card__subtitle mdc-typography mdc-typography--subtitle2">
                        Powertech Test Site
                    </h3>
                </div>
                <div className="demo-card__secondary mdc-typography mdc-typography--body2">
                    {props.status}, Charging: {props.charging ? 'Yes' : 'No'}
                </div>
            </div>
            <div className="mdc-card__actions">
                <div className="mdc-card__action-buttons" style={{ flexWrap: 'wrap' }}>
                    {props.children}
                </div>
            </div>
        </div>
    );
};
