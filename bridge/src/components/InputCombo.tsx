import React from 'react'




interface InputComboProps {
	value: 			string
	data: 			ListDataType[]
	onChange?:		(key: string) => void
}

const InputCombo = ({value, data, onChange}: InputComboProps) => {
	const refMenu = React.useRef<HTMLInputElement>(null)

	const [id] = React.useState(Math.round(Math.random()*1e8))
	const [item, setItem] = React.useState<ListDataType|null>(null)
	const [query, setQuery] = React.useState('')

	React.useEffect(()=>{
		const v = data.find(i=>(i.key===value))
		if (v) setItem(v)
	}, [value, data])

	const onValue = (key: string) => {
		if (onChange) onChange(key);
		// if (refMenu && refMenu.current) {
		// 	refMenu.current.style.display = 'none'
		// 	setTimeout(()=>(refMenu && refMenu.current && (refMenu.current.style.display = '')), 100)
		// }
		if (refMenu && refMenu.current) {
			refMenu.current.checked = false
		}
	}
	return (
		<div className="asset">
			<input ref={refMenu} id={`asset${id}`} type="checkbox" style={{display:'none'}} />
			<label className="asset" htmlFor={`asset${id}`} style={{cursor:'pointer'}}>
				<div className="flex" style={{position: 'relative'}}>
					{item!==null && (
						<>
							<img src={item.icon} style={{width:20, height:20, marginRight:10}} alt={item.key} />
							<span>{item.label}</span>
						</>
					)}
				</div>
				<div>
					<svg width="11" fill="#888" viewBox="0 0 11 11"><path d="M6.431 5.25L2.166 9.581l.918.919 5.25-5.25L3.084 0l-.918.919L6.43 5.25z"></path></svg>
				</div>
			</label>
			
			<div className="list">
				{data.length > 10 && (
					<div className="search">
						<svg width="24" height="24" fill="#5e6673" viewBox="0 0 24 24"><path d="M3 10.982c0 3.845 3.137 6.982 6.982 6.982 1.518 0 3.036-.506 4.149-1.416L18.583 21 20 19.583l-4.452-4.452c.81-1.113 1.416-2.631 1.416-4.149 0-1.922-.81-3.643-2.023-4.958C13.726 4.81 11.905 4 9.982 4 6.137 4 3 7.137 3 10.982zM13.423 7.44a4.819 4.819 0 011.416 3.441c0 1.315-.506 2.53-1.416 3.44a4.819 4.819 0 01-3.44 1.417 4.819 4.819 0 01-3.441-1.417c-1.012-.81-1.518-2.023-1.518-3.339 0-1.315.506-2.53 1.416-3.44.911-1.012 2.227-1.518 3.542-1.518 1.316 0 2.53.506 3.44 1.416z"></path></svg>
						<input type="text" value={query} maxLength={6} onChange={(e)=>setQuery(e.target.value.trim())} />
					</div>
				)}
				
				<div className='scroll' style={{maxHeight: 200, boxShadow: '0 3px 5px #000'}}>
					<ul>
						{data.map((i, k)=>(
							<li key={k} onClick={()=>onValue(i.key)}>
								<img src={i.icon} loading='lazy' style={{width:20, height:20, marginRight:10}} alt={i.key} />
								<span>{i.label}</span>
							</li>
						))}
					</ul>
				</div>
			</div>
			<label className="overlay" htmlFor={`asset${id}`}/>
		</div>
	)
}

export default InputCombo