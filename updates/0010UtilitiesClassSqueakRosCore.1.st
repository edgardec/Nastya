'From Squeak5.2rc1 of 8 October 2018 [latest update: #18202] on 10 September 2020 at 5:31:19 pm'!


!Utilities class methodsFor: '*SqueakRosCore' stamp: 'edc 6/16/2010 09:25'!
deletingMacInvisiblesinOtherOS
"Utilities deletingMacInvisiblesinOtherOS "
	| todo rootDir thisDir path thisName |
	
	rootDir := FileList2 modalFolderSelector.
	path := rootDir pathName.
	todo := rootDir directoryNames asOrderedCollection.
	[todo isEmpty]
		whileFalse: [thisName := todo removeFirst.
			Transcript show: thisName;
				 cr.
			Transcript show: '======>'.
			thisDir := FileDirectory on: path , FileDirectory slash , thisName.
			thisDir
		withAllSubdirectoriesCollect: [:k | 
			self deletingThisFileOn: k]].
	
	self deletingThisFileOn: rootDir! !

!Utilities class methodsFor: '*SqueakRosCore' stamp: 'edc 5/9/2009 05:48'!
deletingThisFileOn: thisDir
	| wrong |
	wrong := thisDir fileNamesMatching: '.*'.
	wrong
		do: [:fn | 
			thisDir deleteFileNamed: fn.
			Transcript show: fn;
				 cr]! !

!Utilities class methodsFor: '*SqueakRosCore' stamp: 'edc 10/16/2009 18:30'!
exportCommonRequests


	"Utilities exportCommonRequests"

	

	

	(CommonRequestStrings == nil or: [CommonRequestStrings isKindOf: Array])
		ifTrue:
			[self initializeCommonRequestStrings]ifFalse:[CommonRequestStrings saveOnFileNamed: 'CRS']
	
! !

!Utilities class methodsFor: '*SqueakRosCore' stamp: 'edc 1/28/2012 17:43'!
importCommonRequests

	"Utilities importCommonRequests"
	|  inputStream anObject  |
	inputStream :=  FileStream oldFileNamed: 'CRS.obj'.
	anObject :=  ReferenceStream on: inputStream.
	anObject := anObject next.
	inputStream close.
	CommonRequestStrings := anObject


	

	! !

!Utilities class methodsFor: '*SqueakRosCore' stamp: 'edc 8/15/2014 07:19'!
methodsWithInitials: targetInitials inClass: aClass 
	"Based on a do-it contributed to the Squeak mailing list by GÂ¦ÃÂ¬Âran
	Hultgen: Browse methods whose initials (in the time-stamp, as logged to
	disk) match the given initials.
	Print out the complete time-stamp table to the Transcript.
	Answer a list of (initials -> count) associations.
	
	CAUTION: It may take several minutes for this to complete."
	"Time millisecondsToRun: [Utilities methodsWithInitials: 'bf']"
	
"(Utilities methodsWithInitials: 'edc' inClass: Utilities) inspect "
	| methodList methodListClass |
	methodList := OrderedCollection new.
	aClass methodDict
				do: [:cm | (cm author = targetInitials) ifTrue:[methodList add: cm]].
	methodListClass := OrderedCollection new.
	aClass class methodDict
				do: [:cm | (cm author = targetInitials) ifTrue:[methodListClass add: cm]].
					^methodList,methodListClass! !

!Utilities class methodsFor: '*SqueakRosCore' stamp: 'edc 4/19/2010 16:54'!
methodsWithInitials: targetInitials inPackage: aPackage 
	"Utilities methodsWithInitials: 'edc' inPackage: 'Monticello'"
	| methodList more|
	methodList := OrderedCollection new.
	(PackageInfo named: aPackage) classes
		do: [:ea | more := (Utilities methodsWithInitials: targetInitials inClass: ea).
			more ifNotEmpty: [methodList
				add: more ]].
	^ methodList! !

!Utilities class methodsFor: '*SqueakRosCore' stamp: 'edc 6/1/2018 07:08'!
updateFromServer
	"Update the image by loading all pending updates from the server."
	| config |

	MonticelloSqueakRosPreference setHighestUpdate: true.
	"Flush all caches. If a previous download failed this is often helpful"
	MCFileBasedRepository flushAllCaches.

	config := MCMcmUpdater updateFromServer.
	config ifNil: [^self inform: 'Unable to retrieve updates from remote repository.' translated].
	"self setSystemVersionFromConfig: config."
	self inform: ('Update completed.
Current update number: ' translated, SystemVersion current highestUpdate).

self updateFromServerCleanup.
MonticelloSqueakRosPreference setHighestUpdate: false.
self updateFromServerCleanup! !

!Utilities class methodsFor: '*SqueakRosCore' stamp: 'edc 6/14/2017 08:07'!
updateFromServerCleanup
"Utilities updateFromServerCleanup"
	MCFileBasedRepository flushAllCaches.
MCDefinition clearInstances.
Smalltalk garbageCollectMost.
! !
