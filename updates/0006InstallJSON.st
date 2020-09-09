| loader |
	loader _ CodeLoader new.
	loader baseURL:'http://www.squeaksource.com/Ladrillos/'.
	loader installLastMonticelloFor: #('JSON'  );installSourceFiles.