
window.Logs = ({ logs }) => {
    return (
        <div
            className="mdc-elevation--z1"
            style={{
                minHeight: "100px",
                maxHeight: "300px",
                padding: "12px",
                overflow: "scroll"
            }}
        >
            <div className="mdc-typography mdc-typography--body2" style={{ marginBottom: "6px" }}>
                OCPP logs
            </div>
            {
                logs.map((log, idx) => 
                    <div className="mdc-typography mdc-typography--body2" key={`log-${idx}`}>
                        {log}
                    </div>
                )
            }
        </div>
    );
};
