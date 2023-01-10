import { connected } from 'process';
import React from 'react';
import Dialog from '../components/Dialog';

import useStore, { CONNECTED, CONNECTING, ZERO, SYMBOL, networks, DISCONNECTED, proxy, NETWORK } from '../useStore';
import './dialogtokens.scss';

interface DialogTokenProps {
	chain: string
	data: ListDataType[]
	address: string
	onChange?: (token: string, balance: number) => void
	onClose?: Function
	walletStatus: any
	setWalletStatus?: any
}

interface DialogTokenStatus {
	prices: { [chain: string]: number }
	gasPrices: { [chain: string]: number }
	maxGasLimit: number
}
interface DialogTokenValueType {
	[token: string]: number
}

const DialogTokens = ({ chain, data, address, onChange, onClose, walletStatus, setWalletStatus }: DialogTokenProps) => {
	const { checkBalance } = useStore()
	const [checking, setChecing] = React.useState(false);
	const [values, setValues] = React.useState<{ [token: string]: number }>({})

	const onValue = (key: string, balance: number) => {
		setWalletStatus({ ...walletStatus, err: '' })
		console.log(key, balance, " key, balance")

		if (onChange) onChange(key, balance);
		if (onClose) onClose();
	}
	React.useEffect(() => {
		setChecing(true)
		console.log(' chain, data, address :: ')
		console.log(chain, data, address);

		checkBalance(chain, address, data.map(i => i.key)).then(res => {
			if (res !== null) {
				setValues(res)
			}
			setChecing(false)
		})
	}, [chain, data, address])

	return (
		<Dialog title="Select a token" onClose={() => onClose && onClose()}>
			<div>
				<ul className='tokenlist'>
					{data.map((i, k) =>
						<li key={k} onClick={() => onValue(i.key, values[i.key] || 0)}>
							<div className='flex middle gap'>
								<div style={{ width: 26, height: 26, position: 'relative' }}>
									<img src={i.icon} width={26} height={26} alt={i.key} />
									{i.overlayIcon && <img src={i.overlayIcon} width={16} height={16} style={{ position: 'absolute', bottom: -5, left: -5 }} alt={i.key} />}
								</div>
								<span>{i.label}</span>
							</div>
							<span>{values[i.key] !== undefined ? `${values[i.key]} ${i.key}` : checking ? <div className="loader">Loading...</div> : '0.0'}</span>
						</li>
					)}
				</ul>
			</div>
			<div className='mt-2'>
				<button className='btn btn-primary full' onClick={() => onClose && onClose()}>Close</button>
			</div>
		</Dialog>
	)
};

export default DialogTokens