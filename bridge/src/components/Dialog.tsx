import React from 'react'

interface DialogProps {
	title?: string
	children?: any
	onClose: Function
}

const Dialog = ({title, children, onClose}: DialogProps) => {
	return (
		<div className="modal">
			<div className="modal-overlay"></div>
			<div className="modal-container">
				<div style={{display: 'flex', justifyContent: 'space-between', padding: '0.5em 1em 0.5em 1em', borderBottom: '1px solid var(--border)'}}>
					<h4 style={{display: 'flex', alignItems: 'center'}}>{title}</h4>
					<div style={{ textAlign: 'right' }}>
						<span className="modal-close" onClick={() => onClose()}>&times;</span>
					</div>
				</div>
				<div style={{padding: '1em'}}>
					{children}
				</div>
				
			</div>
		</div>
	)
}

export default Dialog