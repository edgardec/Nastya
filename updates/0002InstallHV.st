| loader |
	loader _ CodeLoader new.
	loader baseURL:'http://www.squeaksource.com/Ladrillos/'.
	loader installLastMonticelloFor: #('DynamicBindings'  'KomServices' 'KomHttpServer' 'HTML' 'HV' );installSourceFiles.